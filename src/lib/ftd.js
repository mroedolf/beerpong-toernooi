// Pure Fuck the Dealer rules — deck building reuses lib/cod.js. No Vue, no side effects.

export { buildDeck } from './cod.js'

// Rank order used for guessing, low → high. Aas is hoog.
export const GUESS_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'V', 'K', 'A']

// Numeric value per rank (2..14) for the hoger/lager comparison.
export const RANK_VALUE = Object.fromEntries(GUESS_RANKS.map((rank, i) => [rank, i + 2]))

// How the actual card relates to a guess: 'juist' | 'hoger' | 'lager'.
// 'hoger' means the card is higher than the guess (raad volgende keer hoger).
export function compare(guessRank, cardRank) {
  const g = RANK_VALUE[guessRank]
  const c = RANK_VALUE[cardRank]
  if (g === c) return 'juist'
  return c > g ? 'hoger' : 'lager'
}

// Sips the guesser drinks on a full miss: the gap between final guess and card.
export function missSips(finalGuessRank, cardRank) {
  return Math.abs(RANK_VALUE[finalGuessRank] - RANK_VALUE[cardRank])
}

// Sips the dealer drinks on a correct guess — more for a clean first-guess hit.
export function winSips(onFirstGuess) {
  return onFirstGuess ? 3 : 2
}
