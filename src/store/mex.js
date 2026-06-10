import { reactive, watch } from 'vue'
import { rollDie, scoreRoll, lowestOf, dealableSips } from '../lib/mex.js'
import { attachRoom } from '../lib/room.js'

export const MEX_STORAGE_KEY = 'beerpong:mex:v2'

function freshState() {
  return {
    phase: 'lobby', // lobby | playing | result
    players: [],    // { id, name, sips, adjes }
    settings: { baseSips: 2, potPerMex: 0.5, bluffMode: false }, // potPerMex in adjes per thrown Mex
    round: null,
    lastResult: null,
  }
}

function freshRollState() {
  return { dice: [null, null], held: [false, false], throwsUsed: 0, committed: false, dealt: false }
}

function freshRound(number, order) {
  return {
    number,
    starterId: order[0],
    maxThrows: 3,
    mexCount: 0,
    order,
    turnIndex: 0,
    rolls: Object.fromEntries(order.map(id => [id, freshRollState()])),
    rolloffIds: null,
  }
}

function orderFrom(ids, startId) {
  const i = Math.max(0, ids.indexOf(startId))
  return [...ids.slice(i), ...ids.slice(0, i)]
}

// Downgrade structurally impossible stored states (tampered/corrupt storage)
// to a fresh lobby instead of letting the UI crash on them.
export function sanitizeState(parsed) {
  const active = ['playing', 'result'].includes(parsed.phase)
  if (active && ((parsed.players?.length ?? 0) < 2 || !parsed.round)) return freshState()
  if (parsed.phase === 'result' && !parsed.lastResult) return freshState()
  return { ...freshState(), ...parsed }
}

function load() {
  try {
    const raw = localStorage.getItem(MEX_STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!['lobby', 'playing', 'result'].includes(parsed.phase)) return freshState()
    return sanitizeState(parsed)
  } catch {
    return freshState()
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(MEX_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory.
  }
}, { deep: true })

function activeIds() {
  return state.round.rolloffIds ?? state.round.order
}

function requirePlaying() {
  if (state.phase !== 'playing' || !state.round) throw new Error('Geen actieve ronde')
}

function currentRoll() {
  return state.round.rolls[activeIds()[state.round.turnIndex]]
}

function throwCap() {
  return state.round.rolloffIds ? 1 : state.round.maxThrows
}

const actions = {
  addPlayer(name) {
    if (state.phase !== 'lobby') throw new Error('Spelers wijzigen kan alleen in de lobby')
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Geef een naam op')
    const player = { id: crypto.randomUUID(), name: trimmed, sips: 0, adjes: 0 }
    state.players.push(player)
    return player
  },
  removePlayer(id) {
    if (state.phase !== 'lobby') throw new Error('Spelers wijzigen kan alleen in de lobby')
    state.players = state.players.filter(p => p.id !== id)
  },
  movePlayer(id, delta) {
    if (state.phase !== 'lobby') throw new Error('Volgorde wijzigen kan alleen in de lobby')
    const i = state.players.findIndex(p => p.id === id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= state.players.length) return
    const players = state.players
    ;[players[i], players[j]] = [players[j], players[i]]
  },
  importPlayers(names) {
    const existing = new Set(state.players.map(p => p.name))
    for (const name of names) {
      const trimmed = name.trim()
      if (trimmed && !existing.has(trimmed)) {
        this.addPlayer(name)
        existing.add(trimmed)
      }
    }
  },
  setBaseSips(n) {
    state.settings.baseSips = Math.min(5, Math.max(1, Math.round(n)))
  },
  setPotPerMex(amount) {
    // quarter-adje steps between ¼ and 1
    state.settings.potPerMex = Math.min(1, Math.max(0.25, Math.round(amount * 4) / 4))
  },
  setBluffMode(on) {
    state.settings.bluffMode = !!on
  },

  startGame() {
    if (state.players.length < 2) throw new Error('Minstens 2 spelers nodig')
    state.round = freshRound(1, state.players.map(p => p.id))
    state.lastResult = null
    state.phase = 'playing'
  },

  throwDice(rand) {
    requirePlaying()
    const roll = currentRoll()
    if (roll.committed || roll.throwsUsed >= throwCap()) throw new Error('Geen worpen meer — geef door')
    for (const i of [0, 1]) {
      if (!roll.held[i]) roll.dice[i] = rollDie(rand)
    }
    roll.dealt = false // a fresh roll may deal again
    const score = scoreRoll(roll.dice[0], roll.dice[1])
    if (score.rank === 31) {
      // Huisregel: 31 = deel 1 slok uit en krijg de worp terug — the throw never stands.
      return
    }
    roll.throwsUsed += 1
    if (score.isMex) state.round.mexCount += 1
    // A Mex is unbeatable — lock it in so the turn defaults to passing on.
    if (score.isMex || roll.throwsUsed >= throwCap()) this._commit()
  },

  toggleHold(i) {
    requirePlaying()
    if (state.round.rolloffIds) throw new Error('Vasthouden mag niet in een roll-off')
    const roll = currentRoll()
    if (roll.throwsUsed === 0) throw new Error('Eerst gooien')
    if (roll.committed) throw new Error('Worp ligt al vast')
    if (roll.held[i]) {
      roll.held[i] = false
    } else {
      roll.held = i === 0 ? [true, false] : [false, true] // max one die held — swap
    }
  },

  stay() {
    requirePlaying()
    const roll = currentRoll()
    if (roll.throwsUsed === 0) throw new Error('Eerst gooien')
    if (roll.committed) throw new Error('Worp ligt al vast')
    // A returned 31 can be on the table (hold + reroll into 31) — it never stands.
    if (scoreRoll(roll.dice[0], roll.dice[1]).rank === 31) throw new Error('31 staat niet — gooi opnieuw')
    this._commit()
  },

  // Hand the sips from a double (its face value) or a returned 31 (one sip) to
  // a chosen player, so dealt-out sips land on a real tally and totals add up.
  dealSips(targetId) {
    requirePlaying()
    const roll = currentRoll()
    if (roll.dice[0] === null) throw new Error('Eerst gooien')
    if (roll.dealt) throw new Error('Je hebt deze worp al uitgedeeld')
    const amount = dealableSips(roll.dice[0], roll.dice[1])
    if (!amount) throw new Error('Met deze worp deel je niets uit')
    const target = this.playerById(targetId)
    if (!target) throw new Error('Onbekende speler')
    target.sips += amount
    roll.dealt = true
  },

  // Bluff mode: claim a double on any throw and point at one player. Whether
  // the dice really show a double stays the secret. `challenged` records what
  // the table did:
  //   - not challenged → the named player drinks the claimed `amount`
  //   - challenged + real double → the challenger (named player) drinks 2× base
  //   - challenged + bluff       → the thrower drinks 2× base
  // Returns the outcome so the UI can announce it.
  resolveClaim(targetId, amount, challenged) {
    requirePlaying()
    if (!state.settings.bluffMode) throw new Error('Bluffen kan alleen in blufmodus')
    const roll = currentRoll()
    if (roll.dice[0] === null) throw new Error('Eerst gooien')
    if (roll.dealt) throw new Error('Je hebt deze worp al uitgedeeld')
    const v = Math.round(amount)
    if (v < 1 || v > 6) throw new Error('Kies een dubbel van 1 tot 6')
    const byId = activeIds()[state.round.turnIndex]
    const target = this.playerById(targetId)
    if (!target) throw new Error('Kies een speler')
    if (targetId === byId) throw new Error('Kies een andere speler')
    const isRealDouble = roll.dice[0] === roll.dice[1]
    const penalty = 2 * state.settings.baseSips
    let outcome
    if (!challenged) {
      target.sips += v
      outcome = { kind: 'dealt', drinkerId: targetId, amount: v, isRealDouble }
    } else if (isRealDouble) {
      target.sips += penalty // wrong challenge — the dice really were a double
      outcome = { kind: 'wrongChallenge', drinkerId: targetId, amount: penalty, isRealDouble }
    } else {
      this.playerById(byId).sips += penalty // caught bluffing
      outcome = { kind: 'caught', drinkerId: byId, amount: penalty, isRealDouble }
    }
    roll.dealt = true
    return outcome
  },

  _commit() {
    const round = state.round
    const id = activeIds()[round.turnIndex]
    const roll = round.rolls[id]
    roll.committed = true
    if (!round.rolloffIds && id === round.starterId) {
      round.maxThrows = roll.throwsUsed
    }
  },

  passTurn() {
    requirePlaying()
    if (!currentRoll().committed) throw new Error('Eerst gooien')
    const round = state.round
    round.turnIndex += 1
    if (round.turnIndex >= activeIds().length) this._endCycle()
  },

  _endCycle() {
    const round = state.round
    const ids = activeIds()
    const entries = ids.map(id => ({
      id,
      rank: scoreRoll(round.rolls[id].dice[0], round.rolls[id].dice[1]).rank,
    }))
    const losers = lowestOf(entries)
    if (losers.length > 1) {
      round.rolloffIds = losers
      round.turnIndex = 0
      for (const id of losers) round.rolls[id] = freshRollState()
      return
    }
    this._finishRound(losers[0])
  },

  _finishRound(loserId) {
    const round = state.round
    const sips = state.settings.baseSips
    const pot = round.mexCount * state.settings.potPerMex
    const loser = this.playerById(loserId)
    loser.sips += sips
    loser.adjes += pot
    const ranking = round.order
      .map(id => {
        const roll = round.rolls[id]
        return { id, ...scoreRoll(roll.dice[0], roll.dice[1]) }
      })
      .sort((x, y) => (x.id === loserId) - (y.id === loserId) || y.rank - x.rank)
    state.lastResult = { loserId, sips, pot, mexCount: round.mexCount, ranking }
    state.phase = 'result'
  },

  nextRound() {
    if (state.phase !== 'result') throw new Error('De ronde is nog bezig')
    const order = orderFrom(state.players.map(p => p.id), state.lastResult.loserId)
    state.round = freshRound(state.round.number + 1, order)
    state.phase = 'playing'
  },

  stopGame() {
    state.round = null
    state.lastResult = null
    state.phase = 'lobby'
  },

  newGame() {
    for (const p of state.players) {
      p.sips = 0
      p.adjes = 0
    }
    this.stopGame()
  },

  playerById(id) {
    return state.players.find(p => p.id === id)
  },
}

const { room, roomActions } = attachRoom(state, {
  game: 'mex',
  snapshot: () => ({
    phase: state.phase, players: state.players, settings: state.settings,
    round: state.round, lastResult: state.lastResult,
  }),
  applyRemote: d => Object.assign(state, sanitizeState(d)),
  currentActorId: () => {
    if (state.phase !== 'playing' || !state.round) return null
    const ids = state.round.rolloffIds ?? state.round.order
    return ids[state.round.turnIndex] ?? null
  },
})

// Some actions call siblings via `this` — keep the store object intact
// (const m = useMex()); never destructure actions off it.
export function useMex() {
  return { state, ...actions, room, ...roomActions }
}
