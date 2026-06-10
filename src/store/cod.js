import { reactive, watch } from 'vue'
import { buildDeck } from '../lib/cod.js'
import { attachRoom } from '../lib/room.js'

export const COD_STORAGE_KEY = 'cod:v1'

function freshState() {
  return {
    phase: 'lobby', // lobby | playing | finished
    players: [],    // { id, name }
    deck: [],       // remaining cards { rank, suit }
    current: null,  // { card, drawerId }
    kingsDrawn: 0,
    turnIndex: 0,
  }
}

// Downgrade structurally impossible stored states (tampered/corrupt storage)
// to a fresh lobby instead of letting the UI crash on them.
export function sanitizeState(parsed) {
  const active = ['playing', 'finished'].includes(parsed.phase)
  if (active && (!Array.isArray(parsed.players) || parsed.players.length < 2)) return freshState()
  return { ...freshState(), ...parsed }
}

function load() {
  try {
    const raw = localStorage.getItem(COD_STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!['lobby', 'playing', 'finished'].includes(parsed.phase)) return freshState()
    return sanitizeState(parsed)
  } catch {
    return freshState()
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(COD_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory.
  }
}, { deep: true })

const actions = {
  addPlayer(name) {
    if (state.phase !== 'lobby') throw new Error('Spelers wijzigen kan alleen in de lobby')
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Geef een naam op')
    const player = { id: crypto.randomUUID(), name: trimmed }
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
    state.deck = buildDeck(rand)
    state.current = null
    state.kingsDrawn = 0
    state.turnIndex = 0
    state.phase = 'playing'
  },

  drawCard() {
    if (state.phase !== 'playing') throw new Error('Geen actief spel')
    const card = state.deck.shift()
    if (!card) throw new Error('De stapel is op')
    const drawerId = state.players[state.turnIndex % state.players.length].id
    state.current = { card, drawerId }
    state.turnIndex = (state.turnIndex + 1) % state.players.length
    if (card.rank === 'K') {
      state.kingsDrawn += 1
      if (state.kingsDrawn === 4) state.phase = 'finished'
    }
  },

  restart(rand) {
    state.phase = 'lobby'
    this.startGame(rand)
  },

  stopGame() {
    state.deck = []
    state.current = null
    state.kingsDrawn = 0
    state.turnIndex = 0
    state.phase = 'lobby'
  },

  playerById(id) {
    return state.players.find(p => p.id === id)
  },
}

const { room, roomActions } = attachRoom(state, {
  game: 'cod',
  snapshot: () => ({
    phase: state.phase, players: state.players, deck: state.deck,
    current: state.current, kingsDrawn: state.kingsDrawn, turnIndex: state.turnIndex,
  }),
  applyRemote: d => Object.assign(state, sanitizeState(d)),
  currentActorId: () =>
    state.phase === 'playing' ? state.players[state.turnIndex]?.id ?? null : null,
})

// Some actions call siblings via `this` — keep the store object intact
// (const c = useCod()); never destructure actions off it.
export function useCod() {
  return { state, ...actions, room, ...roomActions }
}
