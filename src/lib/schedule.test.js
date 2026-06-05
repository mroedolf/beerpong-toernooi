import { describe, it, expect } from 'vitest'
import { makeTeams, roundRobin, standings, finalsPairings, finalRanking, isPlayed } from './schedule.js'

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }

const playerIds = n => Array.from({ length: n }, (_, i) => `p${i + 1}`)
const teamIds = n => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))

describe('makeTeams', () => {
  it('requires an even count between 4 and 16', () => {
    expect(() => makeTeams(playerIds(2))).toThrow()
    expect(() => makeTeams(playerIds(5))).toThrow()
    expect(() => makeTeams(playerIds(9))).toThrow()
    expect(() => makeTeams(playerIds(18))).toThrow()
  })
  it.each([4, 6, 8, 10, 16])('pairs %i players into teams of 2 covering everyone once', n => {
    const ids = playerIds(n)
    const teams = makeTeams(ids)
    expect(teams).toHaveLength(n / 2)
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

describe('roundRobin for any team count', () => {
  it.each([2, 3, 5, 6, 7, 8])('covers every pairing exactly once for %i teams', n => {
    const ids = teamIds(n)
    const ms = roundRobin(ids)
    expect(ms).toHaveLength((n * (n - 1)) / 2)
    const keys = ms.map(m => [m.teamA, m.teamB].sort().join('-'))
    expect(new Set(keys).size).toBe(ms.length)
    for (const team of ids) {
      expect(ms.filter(m => m.teamA === team || m.teamB === team)).toHaveLength(n - 1)
    }
    expect(new Set(ms.map(m => m.id)).size).toBe(ms.length)
    expect(ms.every(m => !isPlayed(m))).toBe(true)
  })
  it.each([6, 8])('never schedules a team twice in a row for %i teams', n => {
    const ms = roundRobin(teamIds(n))
    for (let i = 1; i < ms.length; i++) {
      const prev = [ms[i - 1].teamA, ms[i - 1].teamB]
      expect(prev).not.toContain(ms[i].teamA)
      expect(prev).not.toContain(ms[i].teamB)
    }
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
  const ranked4 = [{ teamId: 'C' }, { teamId: 'A' }, { teamId: 'D' }, { teamId: 'B' }]

  it('pairs 1v2 and 3v4 from ranking when the losers final is on', () => {
    const { final, losersFinal } = finalsPairings(ranked4, true)
    expect([final.teamA, final.teamB]).toEqual(['C', 'A'])
    expect([losersFinal.teamA, losersFinal.teamB]).toEqual(['D', 'B'])
    expect(isPlayed(final)).toBe(false)
  })
  it('omits the losers final when toggled off', () => {
    const { final, losersFinal } = finalsPairings(ranked4, false)
    expect([final.teamA, final.teamB]).toEqual(['C', 'A'])
    expect(losersFinal).toBeNull()
  })
  it('omits the losers final below 4 teams even when on', () => {
    const { losersFinal } = finalsPairings(ranked4.slice(0, 3), true)
    expect(losersFinal).toBeNull()
  })
  it('produces podium order winner, runner-up, losers-final winner, last', () => {
    const fin = { teamA: 'C', teamB: 'A', winnerId: 'A', cupsLeft: 2 }
    const los = { teamA: 'D', teamB: 'B', winnerId: 'D', cupsLeft: 5 }
    expect(finalRanking(fin, los, ranked4)).toEqual(['A', 'C', 'D', 'B'])
  })
  it('falls back to group order behind the finalists without a losers final', () => {
    const fin = { teamA: 'C', teamB: 'A', winnerId: 'A', cupsLeft: 2 }
    expect(finalRanking(fin, null, ranked4)).toEqual(['A', 'C', 'D', 'B'])
  })
  it('appends teams beyond the top four in group order', () => {
    const ranked6 = ['C', 'A', 'D', 'B', 'E', 'F'].map(teamId => ({ teamId }))
    const fin = { teamA: 'C', teamB: 'A', winnerId: 'A', cupsLeft: 2 }
    const los = { teamA: 'D', teamB: 'B', winnerId: 'B', cupsLeft: 1 }
    expect(finalRanking(fin, los, ranked6)).toEqual(['A', 'C', 'B', 'D', 'E', 'F'])
  })
})
