import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useHilo, sanitizeState, HILO_STORAGE_KEY } from './hilo.js'

describe('hoger lager store', () => {
  let h
  beforeEach(() => {
    localStorage.clear()
    h = useHilo()
    h.newGame()
    h.state.players = []
  })

  function twoPlayers() {
    h.addPlayer('An')
    h.addPlayer('Bert')
    return h.state.players.map(p => p.id)
  }

  function forceCurrent(rank) {
    h.state.current = { rank, suit: '♠' }
  }

  function forceDeck(...ranks) {
    h.state.deck = ranks.map(rank => ({ rank, suit: '♥' }))
  }

  it('starts in lobby and validates', () => {
    expect(h.state.phase).toBe('lobby')
    expect(() => h.addPlayer(' ')).toThrow()
    h.addPlayer('An')
    expect(() => h.startGame()).toThrow(/2 spelers/)
    expect(() => h.guess('hoger')).toThrow()
  })

  it('startGame deals 51 + a visible current card', () => {
    twoPlayers()
    h.startGame()
    expect(h.state.phase).toBe('playing')
    expect(h.state.deck).toHaveLength(51)
    expect(h.state.current.rank).toBeDefined()
    expect(h.state.streak).toBe(0)
    expect(h.state.turnIndex).toBe(0)
  })

  it('a correct guess grows the streak and rotates the turn', () => {
    const [a] = twoPlayers()
    h.startGame()
    forceCurrent('5')
    forceDeck('9')
    h.guess('hoger')
    expect(h.state.streak).toBe(1)
    expect(h.state.turnIndex).toBe(1)
    expect(h.state.current.rank).toBe('9')
    expect(h.state.lastOutcome).toMatchObject({ correct: true, drinkerId: null })
    expect(h.playerById(a).sips).toBe(0)
  })

  it('a wrong guess drinks streak + 1 and resets the streak', () => {
    const [a, b] = twoPlayers()
    h.startGame()
    forceCurrent('5')
    forceDeck('9', '3', 'K')
    h.guess('hoger') // An correct, streak 1
    h.guess('lager') // Bert: 9 -> 3 is lager, correct, streak 2
    h.guess('lager') // An: 3 -> K is hoger, WRONG -> drinks 3
    expect(h.playerById(a).sips).toBe(3)
    expect(h.playerById(b).sips).toBe(0)
    expect(h.state.streak).toBe(0)
    expect(h.state.lastOutcome).toMatchObject({ correct: false, drinkerId: a, sips: 3 })
  })

  it('an equal rank counts as wrong', () => {
    const [a] = twoPlayers()
    h.startGame()
    forceCurrent('7')
    forceDeck('7')
    h.guess('hoger')
    expect(h.playerById(a).sips).toBe(1)
    expect(h.state.lastOutcome.correct).toBe(false)
  })

  it('reshuffles a fresh deck when the pile runs out', () => {
    twoPlayers()
    h.startGame()
    forceCurrent('5')
    forceDeck('9') // last card
    h.guess('hoger')
    expect(h.state.deck).toHaveLength(52)
  })

  it('stopGame keeps tallies, newGame wipes them', () => {
    const [a] = twoPlayers()
    h.startGame()
    forceCurrent('7')
    forceDeck('7')
    h.guess('hoger')
    h.stopGame()
    expect(h.state.phase).toBe('lobby')
    expect(h.playerById(a).sips).toBe(1)
    h.newGame()
    expect(h.playerById(a).sips).toBe(0)
  })

  it('sanitizeState downgrades impossible stored states', () => {
    expect(sanitizeState({ phase: 'playing', players: [], current: null }).phase).toBe('lobby')
    expect(sanitizeState({ phase: 'playing', players: [{}, {}], current: null }).phase).toBe('lobby')
  })

  it('persists on the next tick', async () => {
    twoPlayers()
    await nextTick()
    expect(JSON.parse(localStorage.getItem(HILO_STORAGE_KEY)).players).toHaveLength(2)
  })
})
