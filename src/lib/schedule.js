// Pure tournament logic — no Vue, no side effects.

export function makeTeams(playerIds, rand = Math.random) {
  if (playerIds.length !== 8) throw new Error('Er zijn exact 8 spelers nodig')
  const shuffled = [...playerIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return [0, 2, 4, 6].map(i => [shuffled[i], shuffled[i + 1]])
}

// Fixed 6-match order for 4 teams: every pairing once. A complete 4-team
// round-robin can't avoid back-to-back repeats entirely (provable minimum is
// 2 clashes); this order hits that minimum (clashes only at matches 2->3 and 4->5).
export function roundRobin(teamIds) {
  const [a, b, c, d] = teamIds
  return [[a, b], [c, d], [a, c], [b, d], [a, d], [b, c]].map(([teamA, teamB], i) => ({
    id: `g${i + 1}`,
    teamA,
    teamB,
    winnerId: null,
    cupsLeft: null,
  }))
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

export function finalsPairings(ranked) {
  const ids = ranked.map(r => r.teamId)
  const fresh = (id, teamA, teamB) => ({ id, teamA, teamB, winnerId: null, cupsLeft: null })
  return {
    final: fresh('final', ids[0], ids[1]),
    losersFinal: fresh('losers', ids[2], ids[3]),
  }
}

export function finalRanking(finalMatch, losersMatch) {
  return [finalMatch.winnerId, loserOf(finalMatch), losersMatch.winnerId, loserOf(losersMatch)]
}
