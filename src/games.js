// Registry of available games — the landing page and routes derive from this.
export const GAMES = [
  {
    id: 'beerpong',
    path: '/beerpong',
    emoji: '🏆',
    name: 'Beerpong Toernooi',
    tagline: 'Teams van twee, één kampioen.',
    players: '4–16 spelers · teams van 2',
  },
  {
    id: 'mex',
    path: '/mex',
    emoji: '🎲',
    name: 'Mex',
    tagline: 'Laagste worp drinkt. En de pot loert.',
    players: '2+ spelers',
  },
  {
    id: 'cod',
    path: '/circle',
    emoji: '🃏',
    name: 'Circle of Death',
    tagline: 'Trek een kaart, vrees de koning.',
    players: '2+ spelers',
  },
  {
    id: 'hilo',
    path: '/hogerlager',
    emoji: '🎴',
    name: 'Hoger Lager',
    tagline: 'Hoe langer de reeks, hoe harder de straf.',
    players: '2+ spelers',
  },
  {
    id: 'fles',
    path: '/fles',
    emoji: '🍾',
    name: 'De Fles',
    tagline: 'Wie de fles aanwijst, is de pineut.',
    players: '2+ spelers',
  },
]
