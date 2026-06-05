// Pure Mex (Mexico) dice logic — no Vue, no side effects.

export const MEX_RANK = 10_000

function cryptoRand() {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

export function rollDie(rand = cryptoRand) {
  return 1 + Math.floor(rand() * 6)
}

// Ranking: Mex (2-1) > doubles 600..100 > normal hi*10+lo (65..31).
export function scoreRoll(d1, d2) {
  const [hi, lo] = d1 >= d2 ? [d1, d2] : [d2, d1]
  if (hi === 2 && lo === 1) return { rank: MEX_RANK, label: 'MEX!', isMex: true, isDouble: false }
  if (hi === lo) return { rank: 660 + hi, label: String(hi * 100), isMex: false, isDouble: true }
  return { rank: hi * 10 + lo, label: `${hi}${lo}`, isMex: false, isDouble: false }
}

export function lowestOf(entries) {
  const min = Math.min(...entries.map(e => e.rank))
  return entries.filter(e => e.rank === min).map(e => e.id)
}

export function sipsFor(baseSips, mexCount, mexDoubles) {
  return mexDoubles ? baseSips * 2 ** mexCount : baseSips
}
