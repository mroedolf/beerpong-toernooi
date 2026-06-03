import { reactive, watch } from 'vue'
import {
  makeTeams, roundRobin, standings, finalsPairings, finalRanking, isPlayed,
} from '../lib/schedule.js'
import { randomTeamName, randomScenario } from '../lib/names.js'

export const STORAGE_KEY = 'beerpong:v1'
export const API_KEY_STORAGE = 'beerpong:apikey'

function freshState() {
  return {
    phase: 'setup', // setup | teams | group | finals | podium
    players: [],    // { id, name, photo }
    teams: [],      // { id, name, playerIds: [a, b], aiPhoto, scenario }
    groupMatches: [], // { id, teamA, teamB, winnerId, cupsLeft }
    finalMatch: null,
    losersMatch: null,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!['setup', 'teams', 'group', 'finals', 'podium'].includes(parsed.phase)) return freshState()
    return { ...freshState(), ...parsed }
  } catch {
    return freshState()
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory; surfaced via UI toast on photo saves.
  }
}, { deep: true })

function findMatch(matchId) {
  return (
    state.groupMatches.find(m => m.id === matchId) ??
    (state.finalMatch?.id === matchId ? state.finalMatch : null) ??
    (state.losersMatch?.id === matchId ? state.losersMatch : null)
  )
}

const actions = {
  addPlayer(name) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Geef een naam op')
    if (state.players.length >= 8) throw new Error('Er zijn al 8 spelers')
    const player = { id: crypto.randomUUID(), name: trimmed, photo: null }
    state.players.push(player)
    return player
  },
  updatePlayer(id, patch) {
    const player = state.players.find(p => p.id === id)
    if (player) Object.assign(player, patch)
  },
  removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id)
  },

  buildTeams(rand = Math.random) {
    const pairs = makeTeams(state.players.map(p => p.id), rand)
    const used = new Set()
    state.teams = pairs.map(playerIds => {
      const name = randomTeamName(rand, used)
      used.add(name)
      return { id: crypto.randomUUID(), name, playerIds, aiPhoto: null, scenario: randomScenario(rand) }
    })
    state.phase = 'teams'
  },
  rerollTeams() {
    if (state.phase !== 'teams') throw new Error('Teams liggen al vast')
    this.buildTeams()
  },
  renameTeam(id, name) {
    const team = state.teams.find(t => t.id === id)
    if (team && name.trim()) team.name = name.trim()
  },
  rerollTeamName(id) {
    const team = state.teams.find(t => t.id === id)
    if (!team) return
    const used = new Set(state.teams.filter(t => t.id !== id).map(t => t.name))
    team.name = randomTeamName(Math.random, used)
  },
  setTeamPhoto(id, dataUrl) {
    const team = state.teams.find(t => t.id === id)
    if (team) team.aiPhoto = dataUrl
  },
  rerollScenario(id) {
    const team = state.teams.find(t => t.id === id)
    if (team) team.scenario = randomScenario()
  },

  startGroup() {
    if (state.teams.length !== 4) throw new Error('Eerst teams maken')
    state.groupMatches = roundRobin(state.teams.map(t => t.id))
    state.phase = 'group'
  },

  recordResult(matchId, winnerId, cupsLeft) {
    const match = findMatch(matchId)
    if (!match) throw new Error('Wedstrijd niet gevonden')
    if (winnerId !== match.teamA && winnerId !== match.teamB) throw new Error('Winnaar speelt niet mee in deze wedstrijd')
    const cups = Number(cupsLeft)
    if (!Number.isInteger(cups) || cups < 1 || cups > 10) throw new Error('Bekers over moet tussen 1 en 10 liggen')
    match.winnerId = winnerId
    match.cupsLeft = cups
  },
  clearResult(matchId) {
    const match = findMatch(matchId)
    if (!match) return
    match.winnerId = null
    match.cupsLeft = null
  },

  groupDone() {
    return state.groupMatches.length === 6 && state.groupMatches.every(isPlayed)
  },
  currentStandings() {
    return standings(state.teams, state.groupMatches)
  },

  startFinals() {
    if (!this.groupDone()) throw new Error('De groepsfase is nog niet klaar')
    const { final, losersFinal } = finalsPairings(this.currentStandings())
    state.finalMatch = final
    state.losersMatch = losersFinal
    state.phase = 'finals'
  },

  finishTournament() {
    if (!state.finalMatch || !state.losersMatch || !isPlayed(state.finalMatch) || !isPlayed(state.losersMatch)) {
      throw new Error('Speel eerst beide finales')
    }
    state.phase = 'podium'
  },
  podium() {
    return finalRanking(state.finalMatch, state.losersMatch)
  },

  teamById(id) {
    return state.teams.find(t => t.id === id)
  },
  playerById(id) {
    return state.players.find(p => p.id === id)
  },

  setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key.trim())
  },
  getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) ?? ''
  },

  resetAll() {
    localStorage.removeItem(STORAGE_KEY)
    Object.assign(state, freshState())
  },
}

export function useTournament() {
  return { state, ...actions }
}
