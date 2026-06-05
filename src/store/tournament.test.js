import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useTournament, mergeState, STORAGE_KEY, API_KEY_STORAGE } from './tournament.js'

function eightPlayers(t) {
  for (let i = 1; i <= 8; i++) t.addPlayer(`Speler ${i}`)
}

function nPlayers(t, n) {
  for (let i = 1; i <= n; i++) t.addPlayer(`Speler ${i}`)
}

function playAllGroup(t) {
  for (const m of t.state.groupMatches) t.recordResult(m.id, m.teamA, 3)
}

describe('tournament store', () => {
  let t
  beforeEach(() => {
    localStorage.clear()
    t = useTournament()
    t.resetAll()
  })

  it('starts in setup with no players', () => {
    expect(t.state.phase).toBe('setup')
    expect(t.state.players).toHaveLength(0)
  })

  it('caps players at 16 and trims names', () => {
    nPlayers(t, 16)
    expect(() => t.addPlayer('Zeventiende')).toThrow()
    expect(() => t.addPlayer('   ')).toThrow()
    expect(t.state.players[0].name).toBe('Speler 1')
  })

  it('has tournament settings with sensible defaults', () => {
    expect(t.state.settings).toEqual({ cupsPerGame: 10, losersFinal: true })
  })

  it('mergeState upgrades a legacy blob without settings and keeps stored ones', () => {
    const legacy = mergeState({ phase: 'group', players: [] })
    expect(legacy.settings).toEqual({ cupsPerGame: 10, losersFinal: true })
    expect(legacy.phase).toBe('group')
    const partial = mergeState({ settings: { cupsPerGame: 6 } })
    expect(partial.settings).toEqual({ cupsPerGame: 6, losersFinal: true })
  })

  it('setCupsPerGame accepts only 6 or 10 and drives score validation', () => {
    expect(() => t.setCupsPerGame(8)).toThrow()
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    t.setCupsPerGame(6)
    const m = t.state.groupMatches[0]
    expect(() => t.recordResult(m.id, m.teamA, 7)).toThrow(/1 en 6/)
    t.recordResult(m.id, m.teamA, 6)
    expect(t.state.groupMatches[0].cupsLeft).toBe(6)
  })

  it('runs a 6-player tournament: 3 teams, losers final forced off, podium of 3', () => {
    nPlayers(t, 6)
    t.buildTeams()
    expect(t.state.teams).toHaveLength(3)
    t.startGroup()
    expect(t.state.groupMatches).toHaveLength(3)
    playAllGroup(t)
    expect(t.groupDone()).toBe(true)
    t.startFinals()
    expect(t.state.losersMatch).toBeNull()
    t.recordResult('final', t.state.finalMatch.teamA, 2)
    t.finishTournament()
    expect(t.state.phase).toBe('podium')
    expect(t.podium()).toHaveLength(3)
    expect(t.podium()[0]).toBe(t.state.finalMatch.winnerId)
  })

  it('losers final can be toggled off even with 4 teams', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    playAllGroup(t)
    t.toggleLosersFinal()
    t.startFinals()
    expect(t.state.losersMatch).toBeNull()
    t.recordResult('final', t.state.finalMatch.teamB, 3)
    t.finishTournament()
    expect(t.podium()).toHaveLength(4) // remaining two follow in group order
  })

  it('settings lock once the finals have started', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    playAllGroup(t)
    t.startFinals()
    expect(() => t.setCupsPerGame(6)).toThrow()
    expect(() => t.toggleLosersFinal()).toThrow()
  })

  it('builds 4 named teams from 8 players and moves to teams phase', () => {
    eightPlayers(t)
    t.buildTeams()
    expect(t.state.phase).toBe('teams')
    expect(t.state.teams).toHaveLength(4)
    const names = new Set(t.state.teams.map(team => team.name))
    expect(names.size).toBe(4)
    const allPlayers = t.state.teams.flatMap(team => team.playerIds)
    expect(new Set(allPlayers).size).toBe(8)
  })

  it('refuses to build teams without 8 players', () => {
    t.addPlayer('Eenzaam')
    expect(() => t.buildTeams()).toThrow()
  })

  it('starts group stage with 6 matches', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    expect(t.state.phase).toBe('group')
    expect(t.state.groupMatches).toHaveLength(6)
  })

  it('records and clears results with validation', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    const m = t.state.groupMatches[0]
    expect(() => t.recordResult(m.id, 'not-a-team', 3)).toThrow()
    expect(() => t.recordResult(m.id, m.teamA, 0)).toThrow()
    expect(() => t.recordResult(m.id, m.teamA, 11)).toThrow()
    t.recordResult(m.id, m.teamA, 4)
    expect(t.state.groupMatches[0].winnerId).toBe(m.teamA)
    t.clearResult(m.id)
    expect(t.state.groupMatches[0].winnerId).toBeNull()
  })

  it('blocks finals until all group matches are played, then pairs 1v2 and 3v4', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    expect(() => t.startFinals()).toThrow()
    playAllGroup(t)
    expect(t.groupDone()).toBe(true)
    t.startFinals()
    expect(t.state.phase).toBe('finals')
    const ranked = t.currentStandings().map(r => r.teamId)
    expect([t.state.finalMatch.teamA, t.state.finalMatch.teamB]).toEqual(ranked.slice(0, 2))
    expect([t.state.losersMatch.teamA, t.state.losersMatch.teamB]).toEqual(ranked.slice(2, 4))
  })

  it('finishes to podium and ranks all four teams', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    playAllGroup(t)
    t.startFinals()
    expect(() => t.finishTournament()).toThrow()
    t.recordResult('final', t.state.finalMatch.teamB, 2)
    t.recordResult('losers', t.state.losersMatch.teamA, 6)
    t.finishTournament()
    expect(t.state.phase).toBe('podium')
    const podium = t.podium()
    expect(podium).toHaveLength(4)
    expect(podium[0]).toBe(t.state.finalMatch.winnerId)
  })

  it('persists to localStorage on the next tick', async () => {
    eightPlayers(t)
    t.buildTeams()
    await nextTick() // the persistence watcher flushes async
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).phase).toBe('teams')
  })

  it('stores the API key separately', () => {
    t.setApiKey('geheim')
    expect(t.getApiKey()).toBe('geheim')
    expect(localStorage.getItem(API_KEY_STORAGE)).toBe('geheim')
    expect(localStorage.getItem(STORAGE_KEY) ?? '').not.toContain('geheim')
  })
})
