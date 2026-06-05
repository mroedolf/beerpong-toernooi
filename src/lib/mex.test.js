import { describe, it, expect } from 'vitest'
import { rollDie, scoreRoll, lowestOf, sipsFor, MEX_RANK } from './mex.js'

describe('rollDie', () => {
  it('maps the unit interval onto 1..6', () => {
    expect(rollDie(() => 0)).toBe(1)
    expect(rollDie(() => 0.5)).toBe(4)
    expect(rollDie(() => 0.999999)).toBe(6)
  })
})

describe('scoreRoll', () => {
  it('scores 2+1 as Mex, in either dice order', () => {
    expect(scoreRoll(2, 1)).toMatchObject({ rank: MEX_RANK, label: 'MEX!', isMex: true, isDouble: false })
    expect(scoreRoll(1, 2).isMex).toBe(true)
  })
  it('scores doubles as honderdtallen that beat every normal roll', () => {
    expect(scoreRoll(6, 6)).toMatchObject({ label: '600', isDouble: true, isMex: false })
    expect(scoreRoll(1, 1).label).toBe('100')
    expect(scoreRoll(1, 1).rank).toBeGreaterThan(scoreRoll(6, 5).rank)
    expect(scoreRoll(6, 6).rank).toBeLessThan(MEX_RANK)
  })
  it('scores normal rolls as hi*10+lo', () => {
    expect(scoreRoll(3, 5)).toMatchObject({ rank: 53, label: '53', isMex: false, isDouble: false })
    expect(scoreRoll(3, 1).rank).toBe(31)
  })
  it('orders the classic ranking: Mex > 600 > 100 > 65 > 31', () => {
    const ranks = [scoreRoll(2, 1), scoreRoll(6, 6), scoreRoll(1, 1), scoreRoll(6, 5), scoreRoll(3, 1)].map(s => s.rank)
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks)
  })
})

describe('lowestOf', () => {
  it('returns the single lowest id', () => {
    expect(lowestOf([{ id: 'a', rank: 65 }, { id: 'b', rank: 31 }])).toEqual(['b'])
  })
  it('returns all tied lowest ids', () => {
    expect(lowestOf([{ id: 'a', rank: 31 }, { id: 'b', rank: 31 }, { id: 'c', rank: 600 }])).toEqual(['a', 'b'])
  })
})

describe('sipsFor', () => {
  it('doubles per Mex when enabled', () => {
    expect(sipsFor(2, 0, true)).toBe(2)
    expect(sipsFor(2, 1, true)).toBe(4)
    expect(sipsFor(2, 3, true)).toBe(16)
  })
  it('ignores Mex count when disabled', () => {
    expect(sipsFor(3, 2, false)).toBe(3)
  })
})
