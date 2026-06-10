import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useFtd, sanitizeState, FTD_STORAGE_KEY } from './ftd.js'

describe('fuck the dealer store', () => {
  let d
  beforeEach(() => {
    localStorage.clear()
    d = useFtd()
    d.stopGame()
    d.state.players = []
  })

  function threePlayers() {
    d.addPlayer('An')
    d.addPlayer('Bert')
    d.addPlayer('Cas')
    return d.state.players.map(p => p.id)
  }

  // Force a known card on top of the dealer's stack.
  function topCard(rank, suit = '♠') {
    d.state.deck = [{ rank, suit }]
  }

  it('starts in lobby and validates players', () => {
    expect(d.state.phase).toBe('lobby')
    expect(() => d.addPlayer('  ')).toThrow()
    d.addPlayer('An')
    expect(() => d.startGame()).toThrow(/2 spelers/)
  })

  it('imports names without duplicates, lobby only', () => {
    d.addPlayer('An')
    d.importPlayers(['  An ', 'Bert', '', 'Bert'])
    expect(d.state.players.map(p => p.name)).toEqual(['An', 'Bert'])
  })

  it('startGame deals 52 cards, dealer first, guesser to the left, sips reset', () => {
    threePlayers()
    d.state.players[0].sips = 9
    d.startGame()
    expect(d.state.phase).toBe('playing')
    expect(d.state.deck).toHaveLength(52)
    expect(d.state.table).toEqual([])
    expect(d.state.dealerIndex).toBe(0)
    expect(d.state.turnIndex).toBe(1)
    expect(d.state.step).toBe('guess')
    expect(d.state.players.every(p => p.sips === 0)).toBe(true)
  })

  it('a correct first guess makes the dealer drink 3 and reveals the card', () => {
    const [a] = threePlayers()
    d.startGame()
    topCard('7', '♥')
    d.guess('7')
    expect(d.state.step).toBe('result')
    expect(d.state.result.won).toBe(true)
    expect(d.state.result.onFirst).toBe(true)
    expect(d.state.result.sips).toBe(3)
    expect(d.state.result.drinkerId).toBe(a) // the dealer
    expect(d.state.players[0].sips).toBe(3)
    expect(d.state.deck).toHaveLength(0)
    expect(d.state.table).toHaveLength(1)
    expect(d.state.table[0]).toMatchObject({ rank: '7', suit: '♥', won: true })
  })

  it('a wrong first guess gives a hoger/lager hint and waits for the second', () => {
    threePlayers()
    d.startGame()
    topCard('K')
    d.guess('5')
    expect(d.state.step).toBe('guess')
    expect(d.state.firstGuess).toBe('5')
    expect(d.state.hint).toBe('hoger') // the card is higher than 5
    expect(d.state.deck).toHaveLength(1) // not yet revealed
  })

  it('a correct second guess makes the dealer drink 2', () => {
    threePlayers()
    d.startGame()
    topCard('7')
    d.guess('2') // wrong → hint hoger
    d.guess('7') // right on the second
    expect(d.state.result.won).toBe(true)
    expect(d.state.result.onFirst).toBe(false)
    expect(d.state.result.sips).toBe(2)
    expect(d.state.players[0].sips).toBe(2)
  })

  it('two wrong guesses make the guesser drink the gap to the card', () => {
    const ids = threePlayers()
    d.startGame()
    topCard('7')
    d.guess('2')  // hint hoger
    d.guess('K')  // still wrong → |13 - 7| = 6 sips
    expect(d.state.result.won).toBe(false)
    expect(d.state.result.sips).toBe(6)
    expect(d.state.result.drinkerId).toBe(ids[1]) // the guesser to the left
    expect(d.state.players[1].sips).toBe(6)
    expect(d.state.table[0]).toMatchObject({ rank: '7', won: false, sips: 6 })
  })

  it('next advances the turn and skips the dealer seat', () => {
    threePlayers() // dealer 0, guessers 1 and 2
    d.startGame()
    // Plenty of cards so resolving a turn never empties the stack.
    d.state.deck = Array.from({ length: 10 }, () => ({ rank: '7', suit: '♠' }))
    d.guess('7')
    d.next()
    expect(d.state.turnIndex).toBe(2)
    expect(d.state.step).toBe('guess')
    d.guess('7')
    d.next() // from 2 → 0 is the dealer → skip to 1
    expect(d.state.turnIndex).toBe(1)
  })

  it('next on an empty stack passes the deck to the next dealer with a fresh shuffle', () => {
    threePlayers()
    d.startGame()
    topCard('7') // single card left
    d.guess('7')
    expect(d.state.deck).toHaveLength(0)
    d.next()
    expect(d.state.dealerIndex).toBe(1)
    expect(d.state.turnIndex).toBe(2)
    expect(d.state.deck).toHaveLength(52)
    expect(d.state.table).toEqual([])
    expect(d.state.step).toBe('guess')
  })

  it('passDeck rotates the dealer, reshuffles and clears the table', () => {
    threePlayers()
    d.startGame()
    topCard('7')
    d.guess('7')
    d.passDeck()
    expect(d.state.dealerIndex).toBe(1)
    expect(d.state.turnIndex).toBe(2)
    expect(d.state.table).toEqual([])
    expect(d.state.deck).toHaveLength(52)
  })

  it('guards guessing outside an active game and edits outside the lobby', () => {
    expect(() => d.guess('7')).toThrow()
    threePlayers()
    d.startGame()
    expect(() => d.addPlayer('Dirk')).toThrow()
    topCard('7')
    d.guess('7') // → result
    expect(() => d.guess('7')).toThrow(/volgende kaart/)
  })

  it('stopGame returns to the lobby keeping players', () => {
    threePlayers()
    d.startGame()
    topCard('7')
    d.guess('7')
    d.stopGame()
    expect(d.state.phase).toBe('lobby')
    expect(d.state.players).toHaveLength(3)
    expect(d.state.deck).toEqual([])
    expect(d.state.table).toEqual([])
  })

  it('sanitizeState downgrades structurally impossible stored states', () => {
    expect(sanitizeState({ phase: 'playing', players: [] }).phase).toBe('lobby')
    expect(sanitizeState({ phase: 'playing', players: [{ id: 'a', name: 'A' }] }).phase).toBe('lobby')
    const valid = sanitizeState({
      phase: 'playing',
      players: [{ id: 'a', name: 'A', sips: 0 }, { id: 'b', name: 'B', sips: 0 }],
      dealerIndex: 0,
      turnIndex: 1,
      deck: [{ rank: '3', suit: '♠' }],
      table: [],
      step: 'guess',
    })
    expect(valid.phase).toBe('playing')
    expect(valid.turnIndex).toBe(1)
  })

  it('persists to localStorage on the next tick', async () => {
    threePlayers()
    await nextTick()
    expect(JSON.parse(localStorage.getItem(FTD_STORAGE_KEY)).players).toHaveLength(3)
  })
})
