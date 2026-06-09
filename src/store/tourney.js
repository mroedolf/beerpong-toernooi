import { reactive, watch } from 'vue'
import {
  formTeams, roundRobinMatches, splitGroups, groupStageMatches, rankTeams,
  seedBracket, bracketRoundMatches, nextBracketRound, bracketChampion,
  swissRoundMatches, playedKeysOf, isPlayed, loserOf,
} from '../lib/tourney.js'

export const TOURNEY_STORAGE_KEY = 'drankspelen:tourney:v1'

function freshConfig() {
  return {
    grouping: 'individual', // individual | size | count
    teamSize: 2,
    teamCount: 4,
    format: 'roundrobin',   // roundrobin | swiss | knockout | groupknockout
    swissRounds: 4,
    groupCount: 2,
    advancePerGroup: 2,
    useScores: false,
  }
}

function freshState() {
  return {
    phase: 'setup', // setup | active | done
    players: [],    // { id, name }
    config: freshConfig(),
    teams: [],      // { id, name, playerIds }
    groups: [],     // [[teamId, ...], ...] — only for the group stage
    stage: null,    // league | swiss | group | knockout
    round: 0,       // current round (swiss/knockout); max round otherwise
    matches: [],
    champion: null,
  }
}

const clampInt = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(n) || lo)))

export function sanitizeState(parsed) {
  const fresh = freshState()
  const merged = { ...fresh, ...parsed, config: { ...fresh.config, ...(parsed.config ?? {}) } }
  if (merged.phase === 'active' && (merged.teams.length < 2 || merged.matches.length === 0)) return fresh
  if (merged.phase === 'done' && !merged.champion) return fresh
  return merged
}

function load() {
  try {
    const raw = localStorage.getItem(TOURNEY_STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!['setup', 'active', 'done'].includes(parsed.phase)) return freshState()
    return sanitizeState(parsed)
  } catch {
    return freshState()
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(TOURNEY_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory.
  }
}, { deep: true })

function requireSetup() {
  if (state.phase !== 'setup') throw new Error('Het toernooi is al bezig')
}
function requireActive() {
  if (state.phase !== 'active') throw new Error('Geen actief toernooi')
}

const actions = {
  // --- Setup ---------------------------------------------------------------
  addPlayer(name) {
    requireSetup()
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Geef een naam op')
    if (state.players.length >= 64) throw new Error('Maximaal 64 spelers')
    const player = { id: crypto.randomUUID(), name: trimmed }
    state.players.push(player)
    return player
  },
  removePlayer(id) {
    requireSetup()
    state.players = state.players.filter(p => p.id !== id)
  },
  importPlayers(names) {
    const existing = new Set(state.players.map(p => p.name))
    for (const name of names) {
      const trimmed = name.trim()
      if (trimmed && !existing.has(trimmed)) {
        this.addPlayer(name)
        existing.add(trimmed)
      }
    }
  },

  setGrouping(type) {
    requireSetup()
    if (!['individual', 'size', 'count'].includes(type)) throw new Error('Onbekende indeling')
    state.config.grouping = type
  },
  setTeamSize(n) { requireSetup(); state.config.teamSize = clampInt(n, 1, 16) },
  setTeamCount(n) { requireSetup(); state.config.teamCount = clampInt(n, 2, 16) },
  setFormat(f) {
    requireSetup()
    if (!['roundrobin', 'swiss', 'knockout', 'groupknockout'].includes(f)) throw new Error('Onbekend format')
    state.config.format = f
  },
  setSwissRounds(n) { requireSetup(); state.config.swissRounds = clampInt(n, 1, 10) },
  setGroupCount(n) { requireSetup(); state.config.groupCount = clampInt(n, 1, 8) },
  setAdvancePerGroup(n) { requireSetup(); state.config.advancePerGroup = clampInt(n, 1, 8) },
  setUseScores(on) { requireSetup(); state.config.useScores = !!on },

  // --- Lifecycle -----------------------------------------------------------
  start(rand = Math.random) {
    requireSetup()
    if (state.players.length < 2) throw new Error('Minstens 2 spelers nodig')
    const pools = formTeams(state.players.map(p => p.id), this._groupingMode(), rand)
    if (pools.length < 2) throw new Error('Er zijn minstens 2 teams nodig — pas de indeling aan')
    state.teams = pools.map((playerIds, i) => ({
      id: crypto.randomUUID(),
      name: this._defaultTeamName(playerIds, i),
      playerIds,
    }))
    this._buildInitialMatches()
    state.champion = null
    state.phase = 'active'
  },

  _groupingMode() {
    const c = state.config
    if (c.grouping === 'individual') return { type: 'individual' }
    if (c.grouping === 'size') return { type: 'size', size: c.teamSize }
    return { type: 'count', count: c.teamCount }
  },

  _defaultTeamName(playerIds, i) {
    const names = playerIds.map(id => this.playerById(id)?.name).filter(Boolean)
    return names.length <= 2 ? names.join(' & ') : `Team ${i + 1}`
  },

  _buildInitialMatches() {
    const teamIds = state.teams.map(t => t.id)
    const c = state.config
    state.groups = []
    state.round = 1
    if (c.format === 'roundrobin') {
      state.stage = 'league'
      state.matches = roundRobinMatches(teamIds)
    } else if (c.format === 'swiss') {
      state.stage = 'swiss'
      state.matches = swissRoundMatches(teamIds, 1)
    } else if (c.format === 'knockout') {
      state.stage = 'knockout'
      state.matches = bracketRoundMatches(seedBracket(teamIds), 1)
    } else {
      state.stage = 'group'
      state.groups = splitGroups(teamIds, c.groupCount)
      state.matches = groupStageMatches(state.groups)
    }
  },

  renameTeam(id, name) {
    const team = state.teams.find(t => t.id === id)
    if (team && name.trim()) team.name = name.trim()
  },

  // --- Results -------------------------------------------------------------
  recordResult(matchId, winnerId, scoreA = null, scoreB = null) {
    requireActive()
    const match = state.matches.find(m => m.id === matchId)
    if (!match) throw new Error('Wedstrijd niet gevonden')
    if (!this._isCurrent(match)) throw new Error('Deze ronde ligt al vast')
    if (match.teamB === null) throw new Error('Dit is een bye — er valt niets te spelen')
    if (winnerId !== match.teamA && winnerId !== match.teamB) {
      throw new Error('De winnaar speelt niet mee in deze wedstrijd')
    }
    const coerce = v => {
      if (v === null || v === '') return null
      const num = Number(v)
      if (!Number.isFinite(num) || num < 0) throw new Error('Score moet 0 of hoger zijn')
      return num
    }
    match.winnerId = winnerId
    match.scoreA = coerce(scoreA)
    match.scoreB = coerce(scoreB)
  },
  clearResult(matchId) {
    requireActive()
    const match = state.matches.find(m => m.id === matchId)
    if (!match || match.teamB === null || !this._isCurrent(match)) return
    match.winnerId = null
    match.scoreA = null
    match.scoreB = null
  },

  // --- Stage / round progression ------------------------------------------
  _isCurrent(match) {
    if (match.stage !== state.stage) return false
    if (state.stage === 'league' || state.stage === 'group') return true
    return match.round === state.round
  },
  currentMatches() {
    return state.matches.filter(m => this._isCurrent(m))
  },
  roundComplete() {
    const cur = this.currentMatches()
    return cur.length > 0 && cur.every(isPlayed)
  },
  // What advancing will do next, so the UI can label the button.
  advanceLabel() {
    if (!this.roundComplete()) return null
    const c = state.config
    if (state.stage === 'league') return 'Bekijk de eindstand'
    if (state.stage === 'group') return 'Naar de knockout'
    if (state.stage === 'swiss') return state.round >= c.swissRounds ? 'Bekijk de eindstand' : 'Volgende ronde'
    return bracketChampion(this.currentMatches()) ? 'Kroon de kampioen' : 'Volgende ronde'
  },

  advance() {
    requireActive()
    if (!this.roundComplete()) throw new Error('Speel eerst alle wedstrijden van deze ronde')
    const c = state.config
    if (state.stage === 'league') return this._finish()
    if (state.stage === 'swiss') {
      if (state.round >= c.swissRounds) return this._finish()
      const ranked = rankTeams(this._teamIds(), this._stageMatches('swiss'), this._rankOpts())
      state.round += 1
      state.matches.push(
        ...swissRoundMatches(ranked.map(r => r.teamId), state.round, playedKeysOf(this._stageMatches('swiss'))),
      )
      return
    }
    if (state.stage === 'group') {
      state.stage = 'knockout'
      state.round = 1
      state.matches.push(...bracketRoundMatches(seedBracket(this._advancers()), 1))
      return
    }
    // knockout
    const cur = this.currentMatches()
    const champ = bracketChampion(cur)
    if (champ) return this._finish(champ)
    state.round += 1
    state.matches.push(...nextBracketRound(cur, state.round))
  },

  _advancers() {
    const n = state.config.advancePerGroup
    const perGroup = state.groups.map(teamIds =>
      rankTeams(teamIds, this._groupMatches(teamIds), this._rankOpts()).slice(0, n),
    )
    const ordered = []
    for (let rank = 0; rank < n; rank++) {
      for (const group of perGroup) if (group[rank]) ordered.push(group[rank].teamId)
    }
    return ordered
  },

  _finish(champ = null) {
    if (!champ) {
      const stage = state.stage === 'group' ? 'group' : state.stage
      const ranked = rankTeams(this._teamIds(), this._stageMatches(stage), this._rankOpts())
      champ = ranked[0]?.teamId ?? null
    }
    state.champion = champ
    state.phase = 'done'
  },

  // --- Derived data for the UI --------------------------------------------
  _teamIds() { return state.teams.map(t => t.id) },
  _stageMatches(stage) { return state.matches.filter(m => m.stage === stage) },
  _groupMatches(teamIds) {
    const set = new Set(teamIds)
    return state.matches.filter(m => m.stage === 'group' && set.has(m.teamA))
  },
  _rankOpts() {
    return { useScores: state.config.useScores, nameOf: id => this.teamName(id) }
  },

  // League/swiss standings, or per-group standings during a group stage.
  standings() {
    if (state.stage === 'group') {
      return state.groups.map((teamIds, g) => ({
        group: g,
        rows: rankTeams(teamIds, this._groupMatches(teamIds), this._rankOpts()),
      }))
    }
    const stage = state.stage === 'knockout' ? null : state.stage
    if (!stage) return []
    return [{ group: null, rows: rankTeams(this._teamIds(), this._stageMatches(stage), this._rankOpts()) }]
  },

  // Ordered team ids for the final ranking on the done screen.
  finalRanking() {
    if (state.stage === 'knockout') {
      const placed = []
      const rounds = {}
      for (const m of this._stageMatches('knockout')) (rounds[m.round] ??= []).push(m)
      const maxRound = Math.max(...Object.keys(rounds).map(Number))
      const final = rounds[maxRound][0]
      placed.push(final.winnerId)
      if (loserOf(final)) placed.push(loserOf(final))
      for (let r = maxRound - 1; r >= 1; r--) {
        for (const m of rounds[r]) {
          const l = loserOf(m)
          if (l && !placed.includes(l)) placed.push(l)
        }
      }
      // group non-advancers (or any leftover) appended by overall name order
      for (const id of this._teamIds()) if (!placed.includes(id)) placed.push(id)
      return placed
    }
    const stage = state.stage === 'group' ? 'group' : state.stage
    return rankTeams(this._teamIds(), this._stageMatches(stage), this._rankOpts()).map(r => r.teamId)
  },

  teamById(id) { return state.teams.find(t => t.id === id) },
  playerById(id) { return state.players.find(p => p.id === id) },
  teamName(id) {
    return this.teamById(id)?.name ?? ''
  },
  teamMembers(id) {
    return (this.teamById(id)?.playerIds ?? []).map(pid => this.playerById(pid)?.name).filter(Boolean)
  },

  backToSetup() {
    // Keep players & config; drop the bracket so settings can be tweaked.
    state.phase = 'setup'
    state.teams = []
    state.groups = []
    state.matches = []
    state.stage = null
    state.round = 0
    state.champion = null
  },
  reset() {
    Object.assign(state, freshState())
  },
}

export function useTourney() {
  return { state, ...actions }
}
