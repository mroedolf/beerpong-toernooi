import { describe, it, expect } from 'vitest'
import { rollDie, scoreRoll, lowestOf, formatAdjes, MEX_RANK } from './mex.js'

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

describe('formatAdjes', () => {
  it('renders quarter fractions with unicode symbols', () => {
    expect(formatAdjes(0.25)).toBe('¼')
    expect(formatAdjes(0.5)).toBe('½')
    expect(formatAdjes(0.75)).toBe('¾')
  })
  it('renders whole and mixed amounts', () => {
    expect(formatAdjes(0)).toBe('0')
    expect(formatAdjes(1)).toBe('1')
    expect(formatAdjes(1.5)).toBe('1½')
    expect(formatAdjes(2.25)).toBe('2¼')
  })
})

