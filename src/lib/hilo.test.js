import { describe, it, expect } from 'vitest'
import { RANK_VALUES, isCorrect } from './hilo.js'
import { RANKS } from './cod.js'

const card = (rank, suit = '♠') => ({ rank, suit })

describe('RANK_VALUES', () => {
  it('orders 2 lowest through ace highest, covering all ranks', () => {
    expect(RANK_VALUES['2']).toBe(2)
    expect(RANK_VALUES['10']).toBe(10)
    expect(RANK_VALUES.B).toBe(11)
    expect(RANK_VALUES.V).toBe(12)
    expect(RANK_VALUES.K).toBe(13)
    expect(RANK_VALUES.A).toBe(14)
    for (const rank of RANKS) expect(RANK_VALUES[rank]).toBeGreaterThan(1)
  })
})

describe('isCorrect', () => {
  it('judges hoger and lager strictly', () => {
    expect(isCorrect(card('5'), card('9'), 'hoger')).toBe(true)
    expect(isCorrect(card('5'), card('9'), 'lager')).toBe(false)
    expect(isCorrect(card('K'), card('3'), 'lager')).toBe(true)
    expect(isCorrect(card('2'), card('A'), 'hoger')).toBe(true)
  })
  it('counts an equal rank as wrong either way', () => {
    expect(isCorrect(card('7', '♠'), card('7', '♥'), 'hoger')).toBe(false)
    expect(isCorrect(card('7', '♠'), card('7', '♥'), 'lager')).toBe(false)
  })
})
