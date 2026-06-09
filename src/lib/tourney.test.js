import { describe, it, expect } from 'vitest'
import {
  formTeams, roundRobinMatches, splitGroups, groupStageMatches, rankTeams,
  seedOrder, seedBracket, bracketRoundMatches, nextBracketRound, bracketChampion,
  pairSequential, swissRoundMatches, playedKeysOf, isPlayed, loserOf,
} from './tourney.js'

// rand that never swaps in Fisher-Yates → formTeams keeps input order.
const stable = () => 0.999

describe('formTeams', () => {
  it('individual: one player per team', () => {
    expect(formTeams(['a', 'b', 'c'], { type: 'individual' }, stable)).toEqual([['a'], ['b'], ['c']])
  })
  it('by size: teams of N, last may be smaller', () => {
    expect(formTeams(['a', 'b', 'c', 'd', 'e'], { type: 'size', size: 2 }, stable))
      .toEqual([['a', 'b'], ['c', 'd'], ['e']])
  })
  it('by count: spreads players as evenly as possible', () => {
    const teams = formTeams(['a', 'b', 'c', 'd', 'e', 'f', 'g'], { type: 'count', count: 3 }, stable)
    expect(teams.map(t => t.length)).toEqual([3, 2, 2])
  })
  it('count never exceeds the number of players', () => {
    expect(formTeams(['a', 'b'], { type: 'count', count: 5 }, stable)).toEqual([['a'], ['b']])
  })
})

describe('roundRobinMatches', () => {
  it('pairs every team exactly once', () => {
    const m = roundRobinMatches(['a', 'b', 'c', 'd'])
    expect(m).toHaveLength(6)
    const keys = m.map(x => [x.teamA, x.teamB].sort().join('|'))
    expect(new Set(keys).size).toBe(6)
    expect(Math.max(...m.map(x => x.round))).toBe(3)
  })
  it('odd counts sit one team out per round, no bye matches', () => {
    const m = roundRobinMatches(['a', 'b', 'c'])
    expect(m).toHaveLength(3)
    expect(m.every(x => x.teamB !== null)).toBe(true)
  })
})

describe('splitGroups', () => {
  it('spreads teams evenly with snake seeding', () => {
    const g = splitGroups(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 2)
    expect(g).toHaveLength(2)
    expect(g[0]).toHaveLength(4)
    expect(g[1]).toHaveLength(4)
    // snake: A gets seed 1, B seed 2, B seed 3, A seed 4 ...
    expect(g[0]).toEqual(['a', 'd', 'e', 'h'])
    expect(g[1]).toEqual(['b', 'c', 'f', 'g'])
  })
  it('tags group matches with their group index', () => {
    const matches = groupStageMatches(splitGroups(['a', 'b', 'c', 'd'], 2))
    expect(matches.every(m => m.stage === 'group')).toBe(true)
    expect(new Set(matches.map(m => m.group))).toEqual(new Set([0, 1]))
  })
})

describe('rankTeams', () => {
  it('orders by wins, then score saldo', () => {
    const ids = ['a', 'b', 'c']
    const matches = [
      { teamA: 'a', teamB: 'b', winnerId: 'a', scoreA: 10, scoreB: 4 },
      { teamA: 'a', teamB: 'c', winnerId: 'a', scoreA: 10, scoreB: 9 },
      { teamA: 'b', teamB: 'c', winnerId: 'b', scoreA: 10, scoreB: 2 },
    ]
    const ranked = rankTeams(ids, matches, { useScores: true })
    expect(ranked.map(r => r.teamId)).toEqual(['a', 'b', 'c'])
    expect(ranked[0].wins).toBe(2)
  })
  it('ignores unplayed matches and byes', () => {
    const ranked = rankTeams(['a', 'b'], [
      { teamA: 'a', teamB: 'b', winnerId: null, scoreA: null, scoreB: null },
      { teamA: 'a', teamB: null, winnerId: 'a', scoreA: null, scoreB: null },
    ], {})
    expect(ranked.every(r => r.played === 0)).toBe(true)
  })
})

describe('knockout bracket', () => {
  it('seeds in standard order', () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3])
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })
  it('gives byes to the top seeds when the field is not a power of two', () => {
    const pairs = seedBracket(['s1', 's2', 's3', 's4', 's5', 's6'])
    expect(pairs).toHaveLength(4) // 8-slot bracket
    const byeTeams = pairs.filter(p => p[1] === null).map(p => p[0])
    expect(byeTeams.sort()).toEqual(['s1', 's2'])
  })
  it('auto-advances byes and progresses to a champion', () => {
    let round = bracketRoundMatches(seedBracket(['a', 'b', 'c', 'd']), 1)
    expect(round).toHaveLength(2)
    // play the semis
    round[0].winnerId = round[0].teamA
    round[1].winnerId = round[1].teamA
    const final = nextBracketRound(round, 2)
    expect(final).toHaveLength(1)
    final[0].winnerId = final[0].teamB
    expect(nextBracketRound(final, 3)).toEqual([])
    expect(bracketChampion(final)).toBe(final[0].teamB)
  })
  it('a bye match is already played and advances its team', () => {
    const round = bracketRoundMatches(seedBracket(['a', 'b', 'c']), 1)
    const bye = round.find(m => m.teamB === null)
    expect(bye.winnerId).toBe(bye.teamA)
    expect(isPlayed(bye)).toBe(true)
  })
})

describe('swiss pairing', () => {
  it('pairs an ordered list head-to-head', () => {
    expect(pairSequential(['a', 'b', 'c', 'd'])).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('avoids an immediate rematch when it can', () => {
    const played = playedKeysOf([{ teamA: 'a', teamB: 'b', winnerId: 'a' }])
    expect(pairSequential(['a', 'b', 'c', 'd'], played)).toEqual([['a', 'c'], ['b', 'd']])
  })
  it('gives the odd team out a bye', () => {
    const m = swissRoundMatches(['a', 'b', 'c'], 1)
    expect(m).toHaveLength(2)
    const bye = m.find(x => x.teamB === null)
    expect(bye.winnerId).toBe(bye.teamA)
  })
})

describe('loserOf', () => {
  it('returns the other team, or null for byes/unplayed', () => {
    expect(loserOf({ teamA: 'a', teamB: 'b', winnerId: 'a' })).toBe('b')
    expect(loserOf({ teamA: 'a', teamB: null, winnerId: 'a' })).toBe(null)
    expect(loserOf({ teamA: 'a', teamB: 'b', winnerId: null })).toBe(null)
  })
})
