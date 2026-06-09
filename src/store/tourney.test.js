import { describe, it, expect, beforeEach } from 'vitest'
import { useTourney, sanitizeState } from './tourney.js'

const stable = () => 0.999 // Fisher-Yates no-op → team pools keep player order

describe('tourney store', () => {
  let t
  beforeEach(() => {
    localStorage.clear()
    t = useTourney()
    t.reset()
  })

  function addPlayers(n) {
    for (let i = 0; i < n; i++) t.addPlayer(`P${i}`)
    return t.state.players.map(p => p.id)
  }

  // Play every match of the current round, the home team always winning.
  function winCurrentRound() {
    for (const m of t.currentMatches()) {
      if (m.teamB !== null && m.winnerId === null) t.recordResult(m.id, m.teamA)
    }
  }

  it('starts in setup and needs at least two teams', () => {
    expect(t.state.phase).toBe('setup')
    t.addPlayer('Solo')
    expect(() => t.start(stable)).toThrow(/2 spelers/)
  })

  it('round robin: every pairing once, then a champion on the standings', () => {
    addPlayers(4)
    t.setFormat('roundrobin')
    t.start(stable)
    expect(t.state.stage).toBe('league')
    expect(t.state.matches).toHaveLength(6)
    winCurrentRound()
    expect(t.roundComplete()).toBe(true)
    expect(t.advanceLabel()).toMatch(/eindstand/i)
    t.advance()
    expect(t.state.phase).toBe('done')
    // P0 won every game it played as home team → champion
    expect(t.state.champion).toBe(t.state.teams[0].id)
  })

  it('swiss: runs the configured number of rounds then finishes', () => {
    addPlayers(4)
    t.setFormat('swiss')
    t.setSwissRounds(2)
    t.start(stable)
    expect(t.state.stage).toBe('swiss')
    expect(t.state.round).toBe(1)
    winCurrentRound()
    t.advance()
    expect(t.state.round).toBe(2)
    winCurrentRound()
    expect(t.advanceLabel()).toMatch(/eindstand/i)
    t.advance()
    expect(t.state.phase).toBe('done')
  })

  it('knockout: bracket progresses to a single champion', () => {
    addPlayers(4)
    t.setFormat('knockout')
    t.start(stable)
    expect(t.state.stage).toBe('knockout')
    expect(t.currentMatches()).toHaveLength(2) // semis
    winCurrentRound()
    t.advance()
    expect(t.currentMatches()).toHaveLength(1) // final
    const final = t.currentMatches()[0]
    t.recordResult(final.id, final.teamB)
    expect(t.advanceLabel()).toMatch(/kampioen/i)
    t.advance()
    expect(t.state.phase).toBe('done')
    expect(t.state.champion).toBe(final.teamB)
  })

  it('knockout with byes: non-power-of-two field still resolves', () => {
    addPlayers(3)
    t.setFormat('knockout')
    t.start(stable)
    // 4-slot bracket: one real semi + one bye
    expect(t.currentMatches().some(m => m.teamB === null)).toBe(true)
    winCurrentRound()
    t.advance()
    const final = t.currentMatches()[0]
    t.recordResult(final.id, final.teamA)
    t.advance()
    expect(t.state.phase).toBe('done')
  })

  it('group + knockout: group winners advance into the bracket', () => {
    addPlayers(4)
    t.setFormat('groupknockout')
    t.setGroupCount(2)
    t.setAdvancePerGroup(1)
    t.start(stable)
    expect(t.state.stage).toBe('group')
    expect(t.state.groups).toHaveLength(2)
    winCurrentRound()
    expect(t.advanceLabel()).toMatch(/knockout/i)
    t.advance()
    expect(t.state.stage).toBe('knockout')
    expect(t.currentMatches()).toHaveLength(1) // 2 advancers → straight final
    const final = t.currentMatches()[0]
    t.recordResult(final.id, final.teamA)
    t.advance()
    expect(t.state.phase).toBe('done')
    expect(t.state.champion).toBe(final.teamA)
  })

  it('forms teams by size and by count', () => {
    addPlayers(6)
    t.setGrouping('size')
    t.setTeamSize(2)
    t.start(stable)
    expect(t.state.teams).toHaveLength(3)
    expect(t.state.teams.every(team => team.playerIds.length === 2)).toBe(true)

    t.backToSetup()
    t.setGrouping('count')
    t.setTeamCount(2)
    t.start(stable)
    expect(t.state.teams).toHaveLength(2)
    expect(t.state.teams.every(team => team.playerIds.length === 3)).toBe(true)
  })

  it('validates and clears results, and locks past rounds', () => {
    const ids = addPlayers(4)
    t.setFormat('knockout')
    t.start(stable)
    const [m1] = t.currentMatches()
    expect(() => t.recordResult(m1.id, ids[0])).toThrow(/speelt niet mee/) // ids[0] is a player, not a team
    t.recordResult(m1.id, m1.teamA, 10, 6)
    expect(t.teamById(m1.winnerId)).toBeTruthy()
    t.clearResult(m1.id)
    expect(m1.winnerId).toBe(null)
    // finish round 1 and advance, then round-1 matches are locked
    winCurrentRound()
    t.advance()
    expect(() => t.recordResult(m1.id, m1.teamA)).toThrow(/ligt al vast/)
  })

  it('uses scores for the saldo tiebreak when enabled', () => {
    addPlayers(3)
    t.setFormat('roundrobin')
    t.setUseScores(true)
    t.start(stable)
    const ms = t.currentMatches()
    for (const m of ms) t.recordResult(m.id, m.teamA, 10, 4) // home team always wins by 6
    const rows = t.standings()[0].rows
    expect(rows).toHaveLength(3)
    // sorted by wins desc, and winners carry a positive saldo
    expect(rows[0].wins).toBeGreaterThanOrEqual(rows[1].wins)
    expect(rows[0].saldo).toBeGreaterThan(0)
  })

  it('sanitizeState drops structurally impossible stored blobs', () => {
    expect(sanitizeState({ phase: 'active', teams: [], matches: [] }).phase).toBe('setup')
    expect(sanitizeState({ phase: 'done', champion: null }).phase).toBe('setup')
    const ok = sanitizeState({ phase: 'setup', players: [], config: { format: 'swiss' } })
    expect(ok.config.format).toBe('swiss')
    expect(ok.config.teamSize).toBe(2) // missing keys backfilled
  })
})
