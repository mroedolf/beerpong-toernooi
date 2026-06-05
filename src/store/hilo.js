import { reactive, watch } from 'vue'
import { buildDeck } from '../lib/cod.js'
import { isCorrect } from '../lib/hilo.js'

export const HILO_STORAGE_KEY = 'hilo:v1'

function freshState() {
  return {
    phase: 'lobby', // lobby | playing
    players: [],    // { id, name, sips }
    deck: [],
    current: null,  // { rank, suit }
    streak: 0,
    turnIndex: 0,
    lastOutcome: null, // { correct, prevCard, nextCard, drinkerId, sips }
  }
}

// Downgrade structurally impossible stored states (tampered/corrupt storage)
// to a fresh lobby instead of letting the UI crash on them.
export function sanitizeState(parsed) {
  if (parsed.phase === 'playing' &&
      ((parsed.players?.length ?? 0) < 2 || !parsed.current)) {
    return freshState()
  }
  return { ...freshState(), ...parsed }
}

function load() {
  try {
    const raw = localStorage.getItem(HILO_STORAGE_KEY)
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
    localStorage.setItem(HILO_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory.
  }
}, { deep: true })

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
    state.deck = buildDeck(rand)
    state.current = state.deck.shift()
    state.streak = 0
    state.turnIndex = 0
    state.lastOutcome = null
    state.phase = 'playing'
  },

  guess(direction, rand) {
    if (state.phase !== 'playing') throw new Error('Geen actief spel')
    const guesser = state.players[state.turnIndex % state.players.length]
    const prevCard = state.current
    const nextCard = state.deck.shift()
    const correct = isCorrect(prevCard, nextCard, direction)
    if (correct) {
      state.streak += 1
      state.lastOutcome = { correct, prevCard, nextCard, drinkerId: null, sips: 0 }
    } else {
      const sips = state.streak + 1
      guesser.sips += sips
      state.streak = 0
      state.lastOutcome = { correct, prevCard, nextCard, drinkerId: guesser.id, sips }
    }
    state.current = nextCard
    state.turnIndex = (state.turnIndex + 1) % state.players.length
    if (state.deck.length === 0) state.deck = buildDeck(rand)
  },

  stopGame() {
    state.deck = []
    state.current = null
    state.streak = 0
    state.turnIndex = 0
    state.lastOutcome = null
    state.phase = 'lobby'
  },

  newGame() {
    for (const p of state.players) p.sips = 0
    this.stopGame()
  },

  playerById(id) {
    return state.players.find(p => p.id === id)
  },
}

// Some actions call siblings via `this` — keep the store object intact
// (const h = useHilo()); never destructure actions off it.
export function useHilo() {
  return { state, ...actions }
}
