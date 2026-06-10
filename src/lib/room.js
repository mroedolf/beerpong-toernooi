// Generic live-multiplayer engine. Attach it to any game store: the whole game
// state lives in one shared room, every device polls + pushes the full state,
// and a turn-lock keeps only the active player able to act.
//
// Adapter per game:
//   game           — discriminator stored on the room ('mex', 'cod', ...)
//   mode           — 'turns' (turn-based) | 'free' (anyone may act, e.g. De Fles)
//   snapshot()     — serialisable game state to share
//   applyRemote(d) — replace local state with a remote snapshot
//   currentActorId() — id of the player whose turn it is, or null in
//                      lobby/setup phases (then only the host may act)

import { reactive, watch } from 'vue'
import { createRoom, getRoom, updateRoom } from './cloud.js'

const SEATS_KEY = 'drankspelen:rooms' // { [roomId]: { seatId, host } }

function loadSeats() {
  try { return JSON.parse(localStorage.getItem(SEATS_KEY)) || {} } catch { return {} }
}
function saveSeat(roomId, patch) {
  const all = loadSeats()
  all[roomId] = { ...all[roomId], ...patch }
  try { localStorage.setItem(SEATS_KEY, JSON.stringify(all)) } catch { /* quota */ }
}
function seatOf(roomId) {
  return loadSeats()[roomId] ?? {}
}

export const POLL_MS = 2500

export function attachRoom(state, { game, mode = 'turns', snapshot, applyRemote, currentActorId }) {
  const room = reactive({
    id: null,
    game,
    seatId: null,
    isHost: false,
    connected: false,
    lastRev: 0,
    syncing: false,
    error: null,
  })

  let applying = false
  let pushTimer = null
  let pushing = false
  let pendingPush = false
  let pollTimer = null

  async function doPush() {
    if (pushing) { pendingPush = true; return }
    pushing = true
    room.syncing = true
    try {
      do {
        pendingPush = false
        const { rev } = await updateRoom(room.id, snapshot())
        room.lastRev = rev
      } while (pendingPush)
      room.error = null
    } catch (e) {
      room.error = e.message
    } finally {
      pushing = false
      room.syncing = false
    }
  }

  // Sync flush so applyRemote's mutations are seen here while `applying` is still
  // true — otherwise we'd echo the freshly-applied remote state straight back.
  watch(state, () => {
    if (!room.connected || applying) return
    clearTimeout(pushTimer)
    pushTimer = setTimeout(doPush, 400)
  }, { deep: true, flush: 'sync' })

  async function pollOnce() {
    if (!room.id) return
    try {
      const { state: remote, rev } = await getRoom(room.id)
      if (rev > room.lastRev) {
        applying = true
        applyRemote(remote)
        room.lastRev = rev
        applying = false
      }
      room.error = null
    } catch (e) {
      room.error = e.message
    }
  }

  const actions = {
    async hostRoom() {
      room.syncing = true
      room.error = null
      try {
        const { id } = await createRoom(game, snapshot())
        room.id = id
        room.lastRev = 1
        room.isHost = true
        room.connected = true
        saveSeat(id, { host: true })
        return id
      } catch (e) {
        room.error = e.message
        throw e
      } finally {
        room.syncing = false
      }
    },

    async joinRoom(id) {
      room.syncing = true
      room.error = null
      try {
        const { game: g, state: remote, rev } = await getRoom(id)
        if (g !== game) throw new Error('Deze link hoort bij een ander spel')
        applying = true
        applyRemote(remote)
        applying = false
        room.id = id
        room.lastRev = rev
        room.connected = true
        const saved = seatOf(id)
        room.seatId = saved.seatId ?? null
        room.isHost = Boolean(saved.host)
      } catch (e) {
        room.error = e.message
        throw e
      } finally {
        room.syncing = false
      }
    },

    claimSeat(playerId) {
      room.seatId = playerId
      if (room.id) saveSeat(room.id, { seatId: playerId })
    },

    startSync() {
      if (pollTimer || !room.connected) return
      pollTimer = setInterval(pollOnce, POLL_MS)
    },
    stopSync() {
      clearInterval(pollTimer)
      pollTimer = null
    },
    refresh() {
      return pollOnce()
    },

    leaveRoom() {
      this.stopSync()
      room.id = null
      room.connected = false
      room.seatId = null
      room.isHost = false
      room.lastRev = 0
      room.error = null
    },

    // Whether this device may act right now.
    isMyTurn() {
      if (!room.connected) return true // offline: pass-and-play, anyone acts
      if (mode === 'free') return true
      const actor = currentActorId()
      if (actor == null) return room.isHost // lobby/setup is host-controlled
      return actor === room.seatId
    },
    currentActorId() {
      return currentActorId()
    },
  }

  return { room, roomActions: actions }
}
