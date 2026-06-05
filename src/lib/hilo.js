// Pure Hoger Lager judgement — deck building reuses lib/cod.js.

export const RANK_VALUES = {
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  B: 11, V: 12, K: 13, A: 14,
}

// Strict: an equal rank is wrong in both directions.
export function isCorrect(prevCard, nextCard, guess) {
  const prev = RANK_VALUES[prevCard.rank]
  const next = RANK_VALUES[nextCard.rank]
  return guess === 'hoger' ? next > prev : next < prev
}
