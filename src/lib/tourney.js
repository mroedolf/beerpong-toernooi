// Pure general-tournament logic — no Vue, no side effects.
//
// A match is a plain object:
//   { id, stage, round, group, teamA, teamB, winnerId, scoreA, scoreB }
// teamB === null marks a bye (teamA advances for free). Match ids are unique
// across a tournament because they encode stage, round, group and index.

function shuffle(items, rand) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- Team formation --------------------------------------------------------
// mode:
//   { type: 'individual' }   → one player per team
//   { type: 'size', size }   → teams of `size` (a final team may be smaller)
//   { type: 'count', count } → `count` teams, players spread as evenly as possible
export function formTeams(playerIds, mode, rand = Math.random) {
  const ids = shuffle(playerIds, rand)
  if (mode.type === 'individual') return ids.map(id => [id])
  if (mode.type === 'size') {
    const size = Math.max(1, Math.floor(mode.size))
    const teams = []
    for (let i = 0; i < ids.length; i += size) teams.push(ids.slice(i, i + size))
    return teams
  }
  if (mode.type === 'count') {
    const count = Math.max(1, Math.min(Math.floor(mode.count), ids.length))
    const teams = Array.from({ length: count }, () => [])
    ids.forEach((id, i) => teams[i % count].push(id))
    return teams
  }
  throw new Error('Onbekende indeling')
}

// --- Round-robin -----------------------------------------------------------
// Circle method: a null "bye" pads odd counts (those pairings are dropped, so
// one team simply sits out that round — no bye match is emitted).
function circleRounds(teamIds) {
  const teams = [...teamIds]
  if (teams.length % 2 === 1) teams.push(null)
  const rounds = []
  for (let r = 0; r < teams.length - 1; r++) {
    const round = []
    for (let i = 0; i < teams.length / 2; i++) {
      const a = teams[i]
      const b = teams[teams.length - 1 - i]
      if (a !== null && b !== null) round.push([a, b])
    }
    rounds.push(round)
    teams.splice(1, 0, teams.pop())
  }
  return rounds
}

function mkMatch(id, stage, round, group, teamA, teamB) {
  const match = { id, stage, round, group, teamA, teamB, winnerId: null, scoreA: null, scoreB: null }
  if (teamB === null) match.winnerId = teamA // bye advances for free
  return match
}

// All round-robin pairings for one pool, tagged with round numbers. `group` is
// null for a single league, or the group index when used inside a group stage.
export function roundRobinMatches(teamIds, { stage = 'league', group = null } = {}) {
  const out = []
  const prefix = group === null ? 'l' : `g${group}`
  circleRounds(teamIds).forEach((round, r) => {
    round.forEach((pair, i) => {
      out.push(mkMatch(`${prefix}-r${r + 1}-${i}`, stage, r + 1, group, pair[0], pair[1]))
    })
  })
  return out
}

// --- Groups ----------------------------------------------------------------
// Spread teams over `groupCount` pots as evenly as possible (snake order keeps
// strong/weak seeds balanced when teamIds are pre-ranked).
export function splitGroups(teamIds, groupCount) {
  const count = Math.max(1, Math.min(Math.floor(groupCount), teamIds.length))
  const groups = Array.from({ length: count }, () => [])
  teamIds.forEach((id, i) => {
    const row = Math.floor(i / count)
    const col = row % 2 === 0 ? i % count : count - 1 - (i % count)
    groups[col].push(id)
  })
  return groups
}

export function groupStageMatches(groups) {
  return groups.flatMap((teamIds, g) => roundRobinMatches(teamIds, { stage: 'group', group: g }))
}

// --- Standings -------------------------------------------------------------
export function winnerOf(match) {
  return match.winnerId
}
export function loserOf(match) {
  if (match.winnerId === null || match.teamB === null) return null
  return match.winnerId === match.teamA ? match.teamB : match.teamA
}
export function isPlayed(match) {
  return match.winnerId !== null
}

// Ranking within a pool: wins → score saldo → name (resolved by the caller via
// nameOf). Byes (teamB null) don't count as played games.
export function rankTeams(teamIds, matches, { useScores = false, nameOf = () => '' } = {}) {
  const stats = new Map(
    teamIds.map(id => [id, { teamId: id, played: 0, wins: 0, losses: 0, saldo: 0 }]),
  )
  for (const m of matches) {
    if (!isPlayed(m) || m.teamB === null) continue
    const loser = loserOf(m)
    const w = stats.get(m.winnerId)
    const l = stats.get(loser)
    if (!w || !l) continue
    w.played += 1
    l.played += 1
    w.wins += 1
    l.losses += 1
    if (useScores && m.scoreA !== null && m.scoreB !== null) {
      const margin = Math.abs(m.scoreA - m.scoreB)
      w.saldo += margin
      l.saldo -= margin
    }
  }
  return [...stats.values()].sort(
    (x, y) => y.wins - x.wins || y.saldo - x.saldo || nameOf(x.teamId).localeCompare(nameOf(y.teamId), 'nl'),
  )
}

// --- Swiss -----------------------------------------------------------------
function pairKey(a, b) {
  return [a, b].sort().join('|')
}

// Pair an ordered list of team ids, skipping a rematch when an alternative
// exists (greedy: if the next pair was already played, swap the second team
// with the one after it).
export function pairSequential(orderedIds, playedKeys = new Set()) {
  const pool = [...orderedIds]
  const pairs = []
  while (pool.length >= 2) {
    const a = pool.shift()
    let j = 0
    while (j < pool.length - 1 && playedKeys.has(pairKey(a, pool[j]))) j += 1
    const b = pool.splice(j, 1)[0]
    pairs.push([a, b])
  }
  if (pool.length === 1) pairs.push([pool[0], null]) // odd one out sits / byes
  return pairs
}

export function swissRoundMatches(orderedIds, round, playedKeys = new Set()) {
  return pairSequential(orderedIds, playedKeys).map((pair, i) =>
    mkMatch(`s-r${round}-${i}`, 'swiss', round, null, pair[0], pair[1]),
  )
}

export function playedKeysOf(matches) {
  const keys = new Set()
  for (const m of matches) {
    if (m.teamB !== null) keys.add(pairKey(m.teamA, m.teamB))
  }
  return keys
}

// --- Knockout bracket ------------------------------------------------------
function nextPow2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

// Standard tournament seeding order for a bracket of `size` slots: 1 meets the
// lowest seed, 2 the next-lowest, etc., so top seeds only meet late.
export function seedOrder(size) {
  let seeds = [1, 2]
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1
    const next = []
    for (const s of seeds) next.push(s, sum - s)
    seeds = next
  }
  return seeds
}

// First-round pairs for a ranked list. Seeds beyond the field are byes (null),
// which fall to the strongest real seeds.
export function seedBracket(rankedIds) {
  const n = rankedIds.length
  const size = nextPow2(Math.max(2, n))
  const slots = seedOrder(size).map(seed => rankedIds[seed - 1] ?? null)
  const pairs = []
  for (let i = 0; i < slots.length; i += 2) pairs.push([slots[i], slots[i + 1]])
  return pairs
}

export function bracketRoundMatches(pairs, round) {
  return pairs.map((pair, i) => mkMatch(`k-r${round}-${i}`, 'knockout', round, null, pair[0], pair[1]))
}

// Next knockout round from the (ordered) winners of the previous round's
// matches. Returns [] once a single champion remains.
export function nextBracketRound(roundMatches, round) {
  const winners = roundMatches.map(winnerOf)
  if (winners.length <= 1) return []
  const pairs = []
  for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1] ?? null])
  return bracketRoundMatches(pairs, round)
}

// Champion id once the final knockout round is a single decided match.
export function bracketChampion(roundMatches) {
  if (roundMatches.length !== 1) return null
  return isPlayed(roundMatches[0]) ? roundMatches[0].winnerId : null
}
