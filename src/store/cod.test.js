import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useCod, COD_STORAGE_KEY } from './cod.js'

// rand that deals the deck unshuffled (Fisher-Yates with j === i keeps order)
const identityRand = () => 0.9999999

describe('circle of death store', () => {
  let c
  beforeEach(() => {
    localStorage.clear()
    c = useCod()
    c.stopGame()
    c.state.players = []
  })

  function twoPlayers() {
    c.addPlayer('An')
    c.addPlayer('Bert')
    return c.state.players.map(p => p.id)
  }

  it('starts in lobby and validates players', () => {
    expect(c.state.phase).toBe('lobby')
    expect(() => c.addPlayer('  ')).toThrow()
    c.addPlayer('An')
    expect(() => c.startGame()).toThrow(/2 spelers/)
  })

  it('imports names without duplicates, lobby only', () => {
    c.addPlayer('An')
    c.importPlayers(['  An ', 'Bert', '', 'Bert'])
    expect(c.state.players.map(p => p.name)).toEqual(['An', 'Bert'])
  })

  it('startGame deals a fresh 52-card deck and starts at player 0', () => {
    twoPlayers()
    c.startGame()
    expect(c.state.phase).toBe('playing')
    expect(c.state.deck).toHaveLength(52)
    expect(c.state.kingsDrawn).toBe(0)
    expect(c.state.current).toBeNull()
    expect(c.state.turnIndex).toBe(0)
  })

  it('drawCard pops the deck, reveals for the drawer, and rotates the turn', () => {
    const [a, b] = twoPlayers()
    c.startGame()
    c.drawCard()
    expect(c.state.deck).toHaveLength(51)
    expect(c.state.current.drawerId).toBe(a)
    expect(c.state.current.card.rank).toBeDefined()
    expect(c.state.turnIndex).toBe(1)
    c.drawCard()
    expect(c.state.current.drawerId).toBe(b)
    expect(c.state.turnIndex).toBe(0)
  })

  it('counts kings and finishes exactly on the fourth', () => {
    twoPlayers()
    c.startGame()
    // Force a deck with the four kings up front.
    c.state.deck = [
      { rank: 'K', suit: '♠' }, { rank: 'K', suit: '♥' },
      { rank: 'K', suit: '♦' }, { rank: '3', suit: '♣' }, { rank: 'K', suit: '♣' },
    ]
    c.drawCard()
    c.drawCard()
    c.drawCard()
    expect(c.state.kingsDrawn).toBe(3)
    expect(c.state.phase).toBe('playing')
    c.drawCard() // the 3 — no king
    expect(c.state.phase).toBe('playing')
    c.drawCard() // fourth king
    expect(c.state.kingsDrawn).toBe(4)
    expect(c.state.phase).toBe('finished')
    expect(c.state.current.card.rank).toBe('K')
    expect(() => c.drawCard()).toThrow()
  })

  it('restart keeps players and reshuffles straight into playing', () => {
    twoPlayers()
    c.startGame()
    c.state.deck = [{ rank: 'K', suit: '♠' }, { rank: 'K', suit: '♥' }, { rank: 'K', suit: '♦' }, { rank: 'K', suit: '♣' }]
    for (let i = 0; i < 4; i++) c.drawCard()
    expect(c.state.phase).toBe('finished')
    c.restart()
    expect(c.state.phase).toBe('playing')
    expect(c.state.players).toHaveLength(2)
    expect(c.state.deck).toHaveLength(52)
    expect(c.state.kingsDrawn).toBe(0)
    expect(c.state.current).toBeNull()
  })

  it('stopGame returns to the lobby keeping players', () => {
    twoPlayers()
    c.startGame()
    c.drawCard()
    c.stopGame()
    expect(c.state.phase).toBe('lobby')
    expect(c.state.players).toHaveLength(2)
    expect(c.state.deck).toHaveLength(0)
  })

  it('guards drawing outside an active game and player edits outside the lobby', () => {
    expect(() => c.drawCard()).toThrow()
    twoPlayers()
    c.startGame()
    expect(() => c.addPlayer('Cas')).toThrow()
    expect(() => c.removePlayer(c.state.players[0].id)).toThrow()
  })

  it('persists to localStorage on the next tick', async () => {
    twoPlayers()
    await nextTick()
    expect(JSON.parse(localStorage.getItem(COD_STORAGE_KEY)).players).toHaveLength(2)
  })
})
