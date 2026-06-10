import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive } from 'vue'

vi.mock('./cloud.js', () => ({
  createRoom: vi.fn(),
  getRoom: vi.fn(),
  updateRoom: vi.fn(),
}))

import { attachRoom } from './room.js'
import * as cloud from './cloud.js'

const flush = () => new Promise(r => setTimeout(r, 0))

function makeStore(mode = 'turns') {
  const state = reactive({ phase: 'playing', turnIndex: 0, players: [{ id: 'a' }, { id: 'b' }], tick: 0 })
  const { room, roomActions } = attachRoom(state, {
    game: 'mex',
    mode,
    snapshot: () => ({ phase: state.phase, turnIndex: state.turnIndex, players: state.players, tick: state.tick }),
    applyRemote: d => Object.assign(state, d),
    currentActorId: () => (state.phase === 'playing' ? state.players[state.turnIndex].id : null),
  })
  return { state, room, roomActions }
}

describe('attachRoom', () => {
  beforeEach(() => {
    localStorage.clear()
    cloud.createRoom.mockReset().mockResolvedValue({ id: 'r1' })
    cloud.getRoom.mockReset()
    cloud.updateRoom.mockReset().mockResolvedValue({ rev: 2 })
  })

  it('hosting opens a connected room as host', async () => {
    const { room, roomActions } = makeStore()
    const id = await roomActions.hostRoom()
    expect(id).toBe('r1')
    expect(room).toMatchObject({ id: 'r1', connected: true, isHost: true, lastRev: 1 })
  })

  it('joining applies the remote state', async () => {
    cloud.getRoom.mockResolvedValue({ game: 'mex', state: { turnIndex: 1, phase: 'playing', players: [{ id: 'a' }, { id: 'b' }] }, rev: 7 })
    const { state, room, roomActions } = makeStore()
    await roomActions.joinRoom('r2')
    expect(state.turnIndex).toBe(1)
    expect(room).toMatchObject({ id: 'r2', connected: true, isHost: false, lastRev: 7 })
  })

  it('rejects a link from another game', async () => {
    cloud.getRoom.mockResolvedValue({ game: 'cod', state: {}, rev: 1 })
    const { roomActions } = makeStore()
    await expect(roomActions.joinRoom('x')).rejects.toThrow(/ander spel/)
  })

  it('turn-locks to the seated player', async () => {
    cloud.getRoom.mockResolvedValue({ game: 'mex', state: { turnIndex: 1, phase: 'playing', players: [{ id: 'a' }, { id: 'b' }] }, rev: 1 })
    const { state, room, roomActions } = makeStore()
    await roomActions.joinRoom('r2')
    roomActions.claimSeat('b')
    expect(roomActions.isMyTurn()).toBe(true) // turnIndex 1 → player b
    state.turnIndex = 0
    expect(roomActions.isMyTurn()).toBe(false) // now player a
    expect(room.seatId).toBe('b')
  })

  it('lobby phases are host-controlled', async () => {
    cloud.getRoom.mockResolvedValue({ game: 'mex', state: { phase: 'lobby', turnIndex: 0, players: [] }, rev: 1 })
    const { roomActions } = makeStore()
    await roomActions.joinRoom('r2') // joined → not host
    expect(roomActions.isMyTurn()).toBe(false)
  })

  it('free-for-all games never lock', async () => {
    cloud.getRoom.mockResolvedValue({ game: 'mex', state: { phase: 'playing', turnIndex: 0, players: [{ id: 'a' }] }, rev: 1 })
    const { roomActions } = makeStore('free')
    await roomActions.joinRoom('r2')
    expect(roomActions.isMyTurn()).toBe(true)
  })

  it('an edit pushes the full state to the server', async () => {
    vi.useFakeTimers()
    try {
      const { state, roomActions } = makeStore()
      await roomActions.hostRoom()
      state.tick = 1
      await vi.advanceTimersByTimeAsync(450)
      expect(cloud.updateRoom).toHaveBeenCalledWith('r1', expect.objectContaining({ tick: 1 }))
    } finally {
      vi.useRealTimers()
    }
  })

  it('refresh applies a newer remote revision', async () => {
    const { state, room, roomActions } = makeStore()
    await roomActions.hostRoom() // lastRev 1
    cloud.getRoom.mockResolvedValue({ game: 'mex', state: { turnIndex: 1, phase: 'playing', players: [{ id: 'a' }, { id: 'b' }] }, rev: 9 })
    await roomActions.refresh()
    await flush()
    expect(state.turnIndex).toBe(1)
    expect(room.lastRev).toBe(9)
  })
})
