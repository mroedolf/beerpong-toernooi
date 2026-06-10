import { reactive, watch } from 'vue'
import { attachRoom } from '../lib/room.js'

export const FLES_STORAGE_KEY = 'fles:v1'

function cryptoRand() {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

function freshState() {
  return {
    players: [],      // { id, name }
    lastPickedId: null,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(FLES_STORAGE_KEY)
    if (!raw) return freshState()
    return { ...freshState(), ...JSON.parse(raw) }
  } catch {
    return freshState()
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(FLES_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory.
  }
}, { deep: true })

const actions = {
  // No phases: the bottle has no game state to corrupt, players are always editable.
  addPlayer(name) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Geef een naam op')
    const player = { id: crypto.randomUUID(), name: trimmed }
    state.players.push(player)
    return player
  },
  removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id)
    if (state.lastPickedId === id) state.lastPickedId = null
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

  spin(rand = cryptoRand) {
    if (state.players.length < 2) throw new Error('Minstens 2 spelers nodig')
    const picked = state.players[Math.floor(rand() * state.players.length)]
    state.lastPickedId = picked.id
    return picked
  },

  playerById(id) {
    return state.players.find(p => p.id === id)
  },
}

// Free-for-all: no turns, anyone in the room may spin. State just syncs.
const { room, roomActions } = attachRoom(state, {
  game: 'fles',
  mode: 'free',
  snapshot: () => ({ players: state.players, lastPickedId: state.lastPickedId }),
  applyRemote: d => Object.assign(state, {
    players: Array.isArray(d.players) ? d.players : [],
    lastPickedId: d.lastPickedId ?? null,
  }),
  currentActorId: () => null,
})

// Some actions call siblings via `this` — keep the store object intact
// (const f = useFles()); never destructure actions off it.
export function useFles() {
  return { state, ...actions, room, ...roomActions }
}
