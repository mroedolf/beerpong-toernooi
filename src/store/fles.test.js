import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useFles, FLES_STORAGE_KEY } from './fles.js'

describe('de fles store', () => {
  let f
  beforeEach(() => {
    localStorage.clear()
    f = useFles()
    f.state.players = []
    f.state.lastPickedId = null
  })

  it('manages players without phases', () => {
    expect(() => f.addPlayer('  ')).toThrow()
    f.addPlayer('An')
    f.importPlayers([' An ', 'Bert', 'Bert', ''])
    expect(f.state.players.map(p => p.name)).toEqual(['An', 'Bert'])
    f.removePlayer(f.state.players[0].id)
    expect(f.state.players.map(p => p.name)).toEqual(['Bert'])
  })

  it('refuses to spin with fewer than 2 players', () => {
    f.addPlayer('An')
    expect(() => f.spin()).toThrow(/2 spelers/)
  })

  it('spins uniformly with a seeded rand and records the pick', () => {
    f.addPlayer('An')
    f.addPlayer('Bert')
    f.addPlayer('Cas')
    const picked = f.spin(() => 0.4) // floor(0.4 * 3) = 1 -> Bert
    expect(picked.name).toBe('Bert')
    expect(f.state.lastPickedId).toBe(picked.id)
    expect(f.spin(() => 0).name).toBe('An')
    expect(f.spin(() => 0.99).name).toBe('Cas')
  })

  it('persists on the next tick', async () => {
    f.addPlayer('An')
    await nextTick()
    expect(JSON.parse(localStorage.getItem(FLES_STORAGE_KEY)).players).toHaveLength(1)
  })
})
