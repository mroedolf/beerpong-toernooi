import { describe, it, expect } from 'vitest'
import { buildDeck, RULES, RANKS, SUITS } from './cod.js'

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }

describe('buildDeck', () => {
  it('produces 52 unique cards covering every rank × suit', () => {
    const deck = buildDeck()
    expect(deck).toHaveLength(52)
    const keys = new Set(deck.map(c => `${c.rank}${c.suit}`))
    expect(keys.size).toBe(52)
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        expect(keys.has(`${rank}${suit}`)).toBe(true)
      }
    }
  })
  it('shuffles deterministically with a seeded rand', () => {
    const a = buildDeck(seq(0.1, 0.5, 0.9, 0.3, 0.7))
    const b = buildDeck(seq(0.1, 0.5, 0.9, 0.3, 0.7))
    expect(a).toEqual(b)
  })
  it('actually shuffles (different seeds, different order)', () => {
    const a = buildDeck(seq(0.1, 0.9))
    const b = buildDeck(seq(0.8, 0.2))
    expect(a).not.toEqual(b)
  })
})

describe('RULES', () => {
  it('defines a titled Dutch rule for all 13 ranks', () => {
    expect(RANKS).toHaveLength(13)
    for (const rank of RANKS) {
      expect(RULES[rank].title.length).toBeGreaterThan(1)
      expect(RULES[rank].text.length).toBeGreaterThan(10)
    }
  })
  it('marks the king', () => {
    expect(RULES.K.title).toMatch(/[Kk]oning/)
  })
})
