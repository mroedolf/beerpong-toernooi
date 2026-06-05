// Pure tournament logic — no Vue, no side effects.

export function makeTeams(playerIds, rand = Math.random) {
  const n = playerIds.length
  if (n < 4 || n > 16 || n % 2 !== 0) {
    throw new Error('Een even aantal spelers tussen 4 en 16 is nodig')
  }
  const shuffled = [...playerIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return Array.from({ length: n / 2 }, (_, i) => [shuffled[2 * i], shuffled[2 * i + 1]])
}

// Circle-method rounds for any team count (a null "bye" pads odd counts).
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
    teams.splice(1, 0, teams.pop()) // rotate everyone but the first team
  }
  return rounds
}

const toMatches = pairs =>
  pairs.map(([teamA, teamB], i) => ({ id: `g${i + 1}`, teamA, teamB, winnerId: null, cupsLeft: null }))

// One-table round robin for 2–8 teams: every pairing once. The 4-team order is
// hand-tuned (a complete 4-team round-robin provably can't avoid back-to-back
// repeats; this order hits the minimum of 2). Other counts flatten circle-method
// rounds with a boundary de-clash pass — for even counts ≥6 a disjoint match
// always exists per round, so no team ever plays twice in a row; for odd counts
// it's best effort (provably impossible at 3 teams).
export function roundRobin(teamIds) {
  if (teamIds.length === 4) {
    const [a, b, c, d] = teamIds
    return toMatches([[a, b], [c, d], [a, c], [b, d], [a, d], [b, c]])
  }
  const flat = []
  for (const round of circleRounds(teamIds)) {
    const prev = flat[flat.length - 1]
    if (prev) {
      const i = round.findIndex(pair => !pair.includes(prev[0]) && !pair.includes(prev[1]))
      if (i > 0) round.unshift(...round.splice(i, 1))
    }
    flat.push(...round)
  }
  return toMatches(flat)
}

export function isPlayed(match) {
  return match.winnerId !== null
}

export function loserOf(match) {
  return match.winnerId === match.teamA ? match.teamB : match.teamA
}

// Ranking: wins → cup saldo → head-to-head → team name.
export function standings(teams, matches) {
  const stats = new Map(teams.map(t => [t.id, { teamId: t.id, played: 0, wins: 0, losses: 0, saldo: 0 }]))
  for (const m of matches) {
    if (!isPlayed(m)) continue
    const w = stats.get(m.winnerId)
    const l = stats.get(loserOf(m))
    w.played += 1
    l.played += 1
    w.wins += 1
    l.losses += 1
    w.saldo += m.cupsLeft
    l.saldo -= m.cupsLeft
  }
  const nameOf = id => teams.find(t => t.id === id)?.name ?? ''
  const headToHead = (x, y) => {
    const duel = matches.find(m => isPlayed(m) &&
      ((m.teamA === x && m.teamB === y) || (m.teamA === y && m.teamB === x)))
    if (!duel) return 0
    return duel.winnerId === x ? -1 : 1
  }
  const all = [...stats.values()]
  // Count how many teams share the same (wins, saldo) bucket. Head-to-head is
  // only transitive in a strict two-way tie; in a 3+-way tie it can form a
  // Condorcet cycle, so fall through to the name tiebreaker instead.
  const tieCount = new Map()
  for (const s of all) {
    const key = `${s.wins}:${s.saldo}`
    tieCount.set(key, (tieCount.get(key) ?? 0) + 1)
  }
  return all.sort((x, y) =>
    y.wins - x.wins ||
    y.saldo - x.saldo ||
    (tieCount.get(`${x.wins}:${x.saldo}`) === 2 ? headToHead(x.teamId, y.teamId) : 0) ||
    nameOf(x.teamId).localeCompare(nameOf(y.teamId), 'nl'))
}

export function finalsPairings(ranked, includeLosersFinal) {
  const ids = ranked.map(r => r.teamId)
  const fresh = (id, teamA, teamB) => ({ id, teamA, teamB, winnerId: null, cupsLeft: null })
  return {
    final: fresh('final', ids[0], ids[1]),
    losersFinal: includeLosersFinal && ids.length >= 4 ? fresh('losers', ids[2], ids[3]) : null,
  }
}

// Full podium order: final winner/loser, then losers-final winner/loser when it
// was played, then everyone else in group-standings order.
export function finalRanking(finalMatch, losersMatch, ranked) {
  const top = [finalMatch.winnerId, loserOf(finalMatch)]
  if (losersMatch) top.push(losersMatch.winnerId, loserOf(losersMatch))
  const placed = new Set(top)
  return [...top, ...ranked.map(r => r.teamId).filter(id => !placed.has(id))]
}
