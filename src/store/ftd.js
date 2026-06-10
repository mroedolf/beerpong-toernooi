import { reactive, watch } from 'vue'
import { buildDeck, compare, missSips, winSips } from '../lib/ftd.js'

export const FTD_STORAGE_KEY = 'ftd:v1'

function freshState() {
  return {
    phase: 'lobby',  // lobby | playing
    players: [],     // { id, name, sips }
    dealerIndex: 0,  // index into players of the current dealer
    turnIndex: 1,    // index into players of the active guesser (never the dealer while playing)
    deck: [],        // hidden cards still in the dealer's stack { rank, suit }
    table: [],       // revealed cards, oldest → newest { rank, suit, guesserId, won, onFirst, sips }
    step: 'guess',   // guess (awaiting a guess) | result (showing the outcome)
    firstGuess: null, // rank of the first (wrong) guess this turn, else null
    hint: null,      // 'hoger' | 'lager' after a wrong first guess
    result: null,    // { card, won, onFirst, sips, drinkerId }
  }
}

// Downgrade structurally impossible stored states (tampered/corrupt storage)
// to a fresh lobby instead of letting the UI crash on them.
export function sanitizeState(parsed) {
  if (parsed.phase === 'playing' && (!Array.isArray(parsed.players) || parsed.players.length < 2)) {
    return freshState()
  }
  return { ...freshState(), ...parsed }
}

function load() {
  try {
    const raw = localStorage.getItem(FTD_STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!['lobby', 'playing'].includes(parsed.phase)) return freshState()
    return sanitizeState(parsed)
  } catch {
    return freshState()
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(FTD_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory.
  }
}, { deep: true })

// Next guesser after the current turn, skipping over the dealer's seat.
function nextGuesser(from, dealerIndex, n) {
  let i = (from + 1) % n
  if (i === dealerIndex) i = (i + 1) % n
  return i
}

const actions = {
  addPlayer(name) {
    if (state.phase !== 'lobby') throw new Error('Spelers wijzigen kan alleen in de lobby')
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Geef een naam op')
    const player = { id: crypto.randomUUID(), name: trimmed, sips: 0 }
    state.players.push(player)
    return player
  },
  removePlayer(id) {
    if (state.phase !== 'lobby') throw new Error('Spelers wijzigen kan alleen in de lobby')
    state.players = state.players.filter(p => p.id !== id)
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

  startGame(rand) {
    if (state.players.length < 2) throw new Error('Minstens 2 spelers nodig')
    for (const p of state.players) p.sips = 0
    state.dealerIndex = 0
    state.turnIndex = 1 // the player to the dealer's left
    state.deck = buildDeck(rand)
    state.table = []
    state.step = 'guess'
    state.firstGuess = null
    state.hint = null
    state.result = null
    state.phase = 'playing'
  },

  guess(rank) {
    if (state.phase !== 'playing') throw new Error('Geen actief spel')
    if (state.step !== 'guess') throw new Error('Eerst de volgende kaart')
    const card = state.deck[0]
    if (!card) throw new Error('De stapel is op')

    const cmp = compare(rank, card.rank)
    const onFirst = state.firstGuess === null

    if (cmp !== 'juist' && onFirst) {
      // First miss — reveal the direction and wait for the second guess.
      state.firstGuess = rank
      state.hint = cmp
      return
    }

    // Resolved: the card leaves the stack and lands face-up on the table.
    state.deck.shift()
    const guesser = state.players[state.turnIndex]
    let won, sips, drinkerId
    if (cmp === 'juist') {
      won = true
      sips = winSips(onFirst)
      const dealer = state.players[state.dealerIndex]
      dealer.sips += sips
      drinkerId = dealer.id
    } else {
      won = false
      sips = missSips(rank, card.rank)
      guesser.sips += sips
      drinkerId = guesser.id
    }
    state.table.push({ ...card, guesserId: guesser.id, won, onFirst, sips })
    state.result = { card, won, onFirst, sips, drinkerId }
    state.step = 'result'
  },

  next(rand) {
    if (state.phase !== 'playing') throw new Error('Geen actief spel')
    if (state.step !== 'result') return
    if (state.deck.length === 0) {
      // The dealer worked through the whole stack — pass it on, reshuffle fresh.
      this.passDeck(rand)
      return
    }
    state.turnIndex = nextGuesser(state.turnIndex, state.dealerIndex, state.players.length)
    state.step = 'guess'
    state.firstGuess = null
    state.hint = null
    state.result = null
  },

  passDeck(rand) {
    if (state.phase !== 'playing') throw new Error('Geen actief spel')
    const n = state.players.length
    state.dealerIndex = (state.dealerIndex + 1) % n
    state.turnIndex = (state.dealerIndex + 1) % n
    state.deck = buildDeck(rand)
    state.table = []
    state.step = 'guess'
    state.firstGuess = null
    state.hint = null
    state.result = null
  },

  stopGame() {
    state.deck = []
    state.table = []
    state.dealerIndex = 0
    state.turnIndex = 1
    state.step = 'guess'
    state.firstGuess = null
    state.hint = null
    state.result = null
    state.phase = 'lobby'
  },

  playerById(id) {
    return state.players.find(p => p.id === id)
  },
}

// Some actions call siblings via `this` — keep the store object intact
// (const d = useFtd()); never destructure actions off it.
export function useFtd() {
  return { state, ...actions }
}
