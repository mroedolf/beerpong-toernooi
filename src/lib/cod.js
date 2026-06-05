// Pure Circle of Death deck + rules — no Vue, no side effects.

export const SUITS = ['♠', '♥', '♦', '♣']
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'V', 'K']

export const RULES = {
  A: { title: 'Waterval', text: 'Iedereen drinkt; je mag pas stoppen als je buur stopt — de trekker begint.' },
  2: { title: 'Jij', text: 'Wijs iemand aan — die drinkt.' },
  3: { title: 'Ik', text: 'Zelf drinken. Proost.' },
  4: { title: 'Vloer', text: 'Laatste die de vloer aanraakt drinkt.' },
  5: { title: 'Mannen', text: 'Alle mannen drinken.' },
  6: { title: 'Vrouwen', text: 'Alle vrouwen drinken.' },
  7: { title: 'Hemel', text: 'Laatste die een hand omhoog steekt drinkt.' },
  8: { title: 'Maatje', text: 'Kies een maatje — die drinkt vanaf nu telkens met je mee.' },
  9: { title: 'Rijm', text: 'Zeg een woord; om de beurt rijmen. Wie stokt, drinkt.' },
  10: { title: 'Categorieën', text: 'Kies een categorie; om de beurt iets noemen. Wie stokt, drinkt.' },
  B: { title: 'Regel', text: 'Verzin een regel. Overtreders drinken, de rest van het spel.' },
  V: { title: 'Vragenrondje', text: 'Stel iemand een vraag; die vraagt meteen iemand anders. Wie antwoordt of stokt, drinkt.' },
  K: { title: 'Koningsbeker', text: 'Giet wat van je drankje in de koningsbeker. De vierde koning drinkt hem leeg!' },
}

function cryptoRand() {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

export function buildDeck(rand = cryptoRand) {
  const deck = SUITS.flatMap(suit => RANKS.map(rank => ({ rank, suit })))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}
