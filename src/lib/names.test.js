import { describe, it, expect } from 'vitest'
import { randomTeamName, randomScenario, buildTeamPhotoPrompt, ADJECTIVES, NOUNS, SCENARIOS } from './names.js'

describe('randomTeamName', () => {
  it('builds "De <Adjectief> <Naamwoord>"', () => {
    const name = randomTeamName(() => 0)
    expect(name).toBe(`De ${ADJECTIVES[0]} ${NOUNS[0]}`)
  })
  it('avoids excluded names', () => {
    const taken = new Set([`De ${ADJECTIVES[0]} ${NOUNS[0]}`])
    let calls = 0
    const rand = () => (calls++ < 2 ? 0 : 0.5)
    const name = randomTeamName(rand, taken)
    expect(taken.has(name)).toBe(false)
  })
  it('has a decent pool', () => {
    expect(ADJECTIVES.length * NOUNS.length).toBeGreaterThanOrEqual(100)
  })
})

describe('scenarios & prompt', () => {
  it('picks a scenario from the list', () => {
    expect(SCENARIOS).toContain(randomScenario(() => 0.99))
  })
  it('embeds team name and scenario in the prompt', () => {
    const prompt = buildTeamPhotoPrompt('De Natte Pelikanen', SCENARIOS[0])
    expect(prompt).toContain('De Natte Pelikanen')
    expect(prompt).toContain(SCENARIOS[0])
    expect(prompt.toLowerCase()).toContain('both people')
  })
})
