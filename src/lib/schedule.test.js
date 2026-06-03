import { describe, it, expect } from 'vitest'
import { makeTeams, roundRobin, standings, finalsPairings, finalRanking, isPlayed } from './schedule.js'

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }

describe('makeTeams', () => {
  it('throws unless exactly 8 players', () => {
    expect(() => makeTeams(['a', 'b'])).toThrow()
    expect(() => makeTeams(Array.from({ length: 9 }, (_, i) => `p${i}`))).toThrow()
  })
  it('returns 4 pairs covering all 8 ids exactly once', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const teams = makeTeams(ids)
    expect(teams).toHaveLength(4)
    expect(teams.every(t => t.length === 2)).toBe(true)
    expect(teams.flat().sort()).toEqual([...ids].sort())
  })
  it('is deterministic given a seeded rand', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const a = makeTeams(ids, seq(0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.6))
    const b = makeTeams(ids, seq(0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.6))
    expect(a).toEqual(b)
  })
})

describe('roundRobin', () => {
  const matches = roundRobin(['A', 'B', 'C', 'D'])
  it('creates 6 unplayed matches, each team playing 3', () => {
    expect(matches).toHaveLength(6)
    expect(matches.every(m => !isPlayed(m))).toBe(true)
    for (const t of ['A', 'B', 'C', 'D']) {
      expect(matches.filter(m => m.teamA === t || m.teamB === t)).toHaveLength(3)
    }
  })
  it('covers every pairing exactly once', () => {
    const keys = matches.map(m => [m.teamA, m.teamB].sort().join('-')).sort()
    expect(keys).toEqual(['A-B', 'A-C', 'A-D', 'B-C', 'B-D', 'C-D'])
  })
  // A complete 4-team round-robin (6 matches, each team in 3) cannot avoid
  // back-to-back repeats entirely — the provable minimum is 2 such clashes.
  // The schedule must hit that minimum so no team plays more than necessary in a row.
  it('minimises back-to-back repeats (at most the unavoidable 2)', () => {
    let clashes = 0
    for (let i = 1; i < matches.length; i++) {
      const prev = [matches[i - 1].teamA, matches[i - 1].teamB]
      if (prev.includes(matches[i].teamA) || prev.includes(matches[i].teamB)) clashes++
    }
    expect(clashes).toBeLessThanOrEqual(2)
  })
})

describe('standings', () => {
  const teams = [
    { id: 'A', name: 'Alfa' }, { id: 'B', name: 'Bravo' },
    { id: 'C', name: 'Charlie' }, { id: 'D', name: 'Delta' },
  ]
  const played = (teamA, teamB, winnerId, cupsLeft) => ({ id: `${teamA}${teamB}`, teamA, teamB, winnerId, cupsLeft })

  it('returns all teams with zero stats when nothing played, sorted by name', () => {
    const rows = standings(teams, roundRobin(['A', 'B', 'C', 'D']))
    expect(rows.map(r => r.teamId)).toEqual(['A', 'B', 'C', 'D'])
    expect(rows[0]).toMatchObject({ played: 0, wins: 0, losses: 0, saldo: 0 })
  })
  it('ranks by wins, then cup saldo', () => {
    const rows = standings(teams, [
      played('A', 'B', 'A', 3),
      played('C', 'D', 'C', 7),
      played('A', 'C', 'C', 2),
    ])
    // C: 2 wins. A: 1 win. B & D: 0 wins; B saldo -3, D saldo -7.
    expect(rows.map(r => r.teamId)).toEqual(['C', 'A', 'B', 'D'])
    expect(rows[0].saldo).toBe(9)
  })
  it('two-way tie resolved by direct duel', () => {
    const rows = standings(teams, [
      played('A', 'B', 'B', 2),   // B beat A
      played('C', 'A', 'A', 2),   // A 1-1, saldo 0
      played('B', 'D', 'D', 2),   // B 1-1, saldo 0
    ])
    const a = rows.findIndex(r => r.teamId === 'A')
    const b = rows.findIndex(r => r.teamId === 'B')
    expect(b).toBeLessThan(a) // B won the direct duel
  })
})

describe('finals', () => {
  it('pairs 1v2 and 3v4 from ranking', () => {
    const ranked = [{ teamId: 'C' }, { teamId: 'A' }, { teamId: 'D' }, { teamId: 'B' }]
    const { final, losersFinal } = finalsPairings(ranked)
    expect([final.teamA, final.teamB]).toEqual(['C', 'A'])
    expect([losersFinal.teamA, losersFinal.teamB]).toEqual(['D', 'B'])
    expect(isPlayed(final)).toBe(false)
  })
  it('produces podium order winner, runner-up, losers-final winner, last', () => {
    const fin = { teamA: 'C', teamB: 'A', winnerId: 'A', cupsLeft: 2 }
    const los = { teamA: 'D', teamB: 'B', winnerId: 'D', cupsLeft: 5 }
    expect(finalRanking(fin, los)).toEqual(['A', 'C', 'D', 'B'])
  })
})
