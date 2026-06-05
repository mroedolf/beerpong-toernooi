import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useMex, MEX_STORAGE_KEY } from './mex.js'

// rand factory that yields dice faces in order: dieRand(6,5,3,1) -> first throw [6,5], next [3,1]
const dieRand = (...faces) => {
  let i = 0
  return () => (faces[i++] - 0.5) / 6
}

describe('mex store', () => {
  let m
  beforeEach(() => {
    localStorage.clear()
    m = useMex()
    m.newGame()
    m.state.players = []
    // the store is a module singleton — reset settings mutated by earlier tests
    m.state.settings.baseSips = 2
    m.state.settings.mexDoubles = true
  })

  function twoPlayers() {
    m.addPlayer('An')
    m.addPlayer('Bert')
    return m.state.players.map(p => p.id)
  }

  it('starts in lobby and validates players', () => {
    expect(m.state.phase).toBe('lobby')
    expect(() => m.addPlayer('   ')).toThrow()
    m.addPlayer('An')
    expect(() => m.startGame()).toThrow(/2 spelers/)
  })

  it('imports names without duplicating existing ones', () => {
    m.addPlayer('An')
    m.importPlayers(['An', 'Bert', 'Cas'])
    expect(m.state.players.map(p => p.name)).toEqual(['An', 'Bert', 'Cas'])
  })

  it('clamps base sips to 1..5', () => {
    m.setBaseSips(9)
    expect(m.state.settings.baseSips).toBe(5)
    m.setBaseSips(0)
    expect(m.state.settings.baseSips).toBe(1)
  })

  it('startGame builds round 1 with the first player as starter', () => {
    const [a] = twoPlayers()
    m.startGame()
    expect(m.state.phase).toBe('playing')
    expect(m.state.round.number).toBe(1)
    expect(m.state.round.order[0]).toBe(a)
    expect(m.state.round.maxThrows).toBe(3)
  })

  it("staying early caps everyone else's throws", () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5)) // An: 65
    m.stay()
    expect(m.state.round.maxThrows).toBe(1)
    m.passTurn()
    m.throwDice(dieRand(4, 2)) // Bert: 42, auto-commits at cap 1
    expect(m.state.round.rolls[b].committed).toBe(true)
    expect(() => m.throwDice(dieRand(1, 1))).toThrow()
  })

  it('holding keeps one die and swaps the hold to the other on request', () => {
    const [a] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 2)) // [6,2]
    m.toggleHold(0)
    expect(m.state.round.rolls[a].held).toEqual([true, false])
    m.toggleHold(1) // swap
    expect(m.state.round.rolls[a].held).toEqual([false, true])
    m.toggleHold(0) // swap back, keep die 0 = 6
    m.throwDice(dieRand(4)) // rerolls only die 1
    expect(m.state.round.rolls[a].dice).toEqual([6, 4])
    expect(m.state.round.rolls[a].throwsUsed).toBe(2)
  })

  it('cannot hold before the first throw and cannot pass before committing', () => {
    twoPlayers()
    m.startGame()
    expect(() => m.toggleHold(0)).toThrow()
    expect(() => m.passTurn()).toThrow()
    expect(() => m.stay()).toThrow()
  })

  it('resolves the round: loser drinks base sips and result phase opens', () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5)) // An 65
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(3, 1)) // Bert 31 — auto-commit (cap 1)
    m.passTurn()
    expect(m.state.phase).toBe('result')
    expect(m.state.lastResult.loserId).toBe(b)
    expect(m.state.lastResult.sips).toBe(2)
    expect(m.playerById(b).sips).toBe(2)
    expect(m.playerById(a).sips).toBe(0)
  })

  it('every thrown Mex doubles the sips when enabled', () => {
    const [, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(2, 1)) // MEX
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(3, 1))
    m.passTurn()
    expect(m.state.lastResult.sips).toBe(4) // base 2 × 2^1
  })

  it('Mex does not double when the setting is off', () => {
    twoPlayers()
    m.toggleMexDoubles()
    m.startGame()
    m.throwDice(dieRand(2, 1))
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(3, 1))
    m.passTurn()
    expect(m.state.lastResult.sips).toBe(2)
  })

  it('ties trigger a one-throw roll-off until a single loser remains', () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(3, 1)) // An 31
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(1, 3)) // Bert 31 — tie
    m.passTurn()
    expect(m.state.phase).toBe('playing')
    expect(m.state.round.rolloffIds).toEqual([a, b])
    m.throwDice(dieRand(5, 4)) // An 54, auto-commit (roll-off cap 1)
    m.passTurn()
    m.throwDice(dieRand(3, 2)) // Bert 32
    m.passTurn()
    expect(m.state.phase).toBe('result')
    expect(m.state.lastResult.loserId).toBe(b)
  })

  it('the loser starts the next round', () => {
    const [, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5))
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(3, 1))
    m.passTurn()
    m.nextRound()
    expect(m.state.phase).toBe('playing')
    expect(m.state.round.number).toBe(2)
    expect(m.state.round.order[0]).toBe(b)
    expect(m.state.round.maxThrows).toBe(3)
  })

  it('stopGame returns to lobby keeping tallies; newGame wipes them', () => {
    const [, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5))
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(3, 1))
    m.passTurn()
    m.stopGame()
    expect(m.state.phase).toBe('lobby')
    expect(m.playerById(b).sips).toBe(2)
    m.newGame()
    expect(m.playerById(b).sips).toBe(0)
  })

  it('persists to localStorage on the next tick', async () => {
    twoPlayers()
    await nextTick()
    expect(JSON.parse(localStorage.getItem(MEX_STORAGE_KEY)).players).toHaveLength(2)
  })
})
