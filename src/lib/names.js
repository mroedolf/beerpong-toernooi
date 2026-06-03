// Ridiculous Dutch team names + absurd AI photo scenarios. Pure functions.

export const ADJECTIVES = [
  'Natte', 'Dorstige', 'Wankele', 'Glorieuze', 'Schuimende', 'Legendarische',
  'Halfvolle', 'Onverslaanbare', 'Klamme', 'Majestueuze', 'Brakke', 'Gevreesde',
]

export const NOUNS = [
  'Pelikanen', 'Pongmeesters', 'Bekerridders', 'Schuimkonijnen', 'Pilsbaronnen',
  'Tafeltijgers', 'Plonsbroeders', 'Hopduivels', 'Gerstegoden', 'Mikmagiërs',
  'Bekerbazen', 'Balgoochelaars',
]

export function randomTeamName(rand = Math.random, exclude = new Set()) {
  const poolSize = ADJECTIVES.length * NOUNS.length
  for (let attempt = 0; attempt < poolSize; attempt++) {
    const adj = ADJECTIVES[Math.min(Math.floor(rand() * ADJECTIVES.length), ADJECTIVES.length - 1)]
    const noun = NOUNS[Math.min(Math.floor(rand() * NOUNS.length), NOUNS.length - 1)]
    const name = `De ${adj} ${noun}`
    if (!exclude.has(name)) return name
  }
  return `De ${ADJECTIVES[0]} ${NOUNS[0]} ${Math.floor(rand() * 1000)}`
}

export const SCENARIOS = [
  'riding a giant inflatable flamingo through a packed football stadium',
  'as 1980s action movie heroes walking away from a huge explosion in slow motion',
  'as medieval knights jousting on horseback with giant ping pong balls as lances',
  'lifting a gigantic golden trophy overflowing with ping pong balls while confetti rains down',
  'as astronauts playing beer pong on the moon, red cups floating in zero gravity',
  'as champion bodybuilders flexing on a winners podium built entirely from red party cups',
  'riding a tandem bicycle off a ski jump, arms raised triumphantly',
  'as renaissance royalty in an ornate oil painting, solemnly holding golden chalices',
  'surfing together on one surfboard riding a giant wave of beer foam',
  'as cowboys in a spaghetti-western standoff at high noon, holding ping pong paddles like revolvers',
  'as synchronized swimmers performing in a pool filled with ping pong balls',
  'as rock stars on a festival main stage smashing guitars made of red party cups',
]

export function randomScenario(rand = Math.random) {
  return SCENARIOS[Math.min(Math.floor(rand() * SCENARIOS.length), SCENARIOS.length - 1)]
}

export function buildTeamPhotoPrompt(teamName, scenario) {
  return (
    `Create one single hilarious photorealistic image featuring both people from the ` +
    `two attached photos together, with their faces clearly recognizable: ${scenario}. ` +
    `They are a legendary beer pong team called "${teamName}" — show that exact name on a ` +
    `banner, sign or jersey in the scene. Epic, exaggerated, dramatic lighting, ` +
    `like a movie poster. Do not add any other text.`
  )
}
