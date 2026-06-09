import { describe, it, expect } from 'vitest'
import { buildDeck, GUESS_RANKS, RANK_VALUE, compare, missSips, winSips } from './ftd.js'

describe('fuck the dealer rules', () => {
  it('values run 2..14 with the ace high', () => {
    expect(RANK_VALUE['2']).toBe(2)
    expect(RANK_VALUE['10']).toBe(10)
    expect(RANK_VALUE['B']).toBe(11)
    expect(RANK_VALUE['K']).toBe(13)
    expect(RANK_VALUE['A']).toBe(14)
  })

  it('compare reports how the card relates to the guess', () => {
    expect(compare('7', '7')).toBe('juist')
    expect(compare('7', 'K')).toBe('hoger') // card is higher than the guess
    expect(compare('K', '7')).toBe('lager')
    expect(compare('B', 'V')).toBe('hoger')
    expect(compare('A', 'K')).toBe('lager')
  })

  it('missSips is the absolute gap to the actual card', () => {
    expect(missSips('7', '7')).toBe(0)
    expect(missSips('2', 'A')).toBe(12)
    expect(missSips('K', '2')).toBe(11)
    expect(missSips('V', 'B')).toBe(1)
  })

  it('winSips rewards a clean first-guess hit', () => {
    expect(winSips(true)).toBe(3)
    expect(winSips(false)).toBe(2)
  })

  it('buildDeck deals 52 unique cards across the guessable ranks', () => {
    const deck = buildDeck(() => 0.9999999)
    expect(deck).toHaveLength(52)
    const keys = new Set(deck.map(c => `${c.rank}${c.suit}`))
    expect(keys.size).toBe(52)
    // Every dealt rank must be guessable.
    for (const c of deck) expect(GUESS_RANKS).toContain(c.rank)
  })
})
