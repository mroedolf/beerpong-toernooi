import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useMex, sanitizeState, MEX_STORAGE_KEY } from './mex.js'

// rand factory that yields dice faces in order: dieRand(6,5,3,1) -> first throw [6,5], next [3,1]
const dieRand = (...faces) => {
  let i = 0
  return () => (faces[i++] - 0.5) / 6
}

describe('mex store', () => {
  let m
  beforeEach(() => {
    localStorage.clear()
    m = useMex()
    m.newGame()
    m.state.players = []
    // the store is a module singleton — reset settings mutated by earlier tests
    m.state.settings.baseSips = 2
    m.state.settings.potPerMex = 0.5
    m.state.settings.bluffMode = false
  })

  function twoPlayers() {
    m.addPlayer('An')
    m.addPlayer('Bert')
    return m.state.players.map(p => p.id)
  }

  it('starts in lobby and validates players', () => {
    expect(m.state.phase).toBe('lobby')
    expect(() => m.addPlayer('   ')).toThrow()
    m.addPlayer('An')
    expect(() => m.startGame()).toThrow(/2 spelers/)
  })

  it('imports names without duplicating existing ones', () => {
    m.addPlayer('An')
    m.importPlayers(['An', 'Bert', 'Cas'])
    expect(m.state.players.map(p => p.name)).toEqual(['An', 'Bert', 'Cas'])
  })

  it('deduplicates names within the imported list itself', () => {
    m.importPlayers(['  An  ', '   ', 'Bert', 'An'])
    expect(m.state.players.map(p => p.name)).toEqual(['An', 'Bert'])
  })

  it('reorders players in the lobby and stays in bounds', () => {
    m.addPlayer('An')
    m.addPlayer('Bert')
    m.addPlayer('Cas')
    m.movePlayer(m.state.players[2].id, -1) // Cas up one
    expect(m.state.players.map(p => p.name)).toEqual(['An', 'Cas', 'Bert'])
    m.movePlayer(m.state.players[0].id, -1) // already first — no-op
    expect(m.state.players.map(p => p.name)).toEqual(['An', 'Cas', 'Bert'])
    m.movePlayer(m.state.players[2].id, 1) // already last — no-op
    expect(m.state.players.map(p => p.name)).toEqual(['An', 'Cas', 'Bert'])
  })

  it('cannot reorder players outside the lobby', () => {
    const [a] = twoPlayers()
    m.startGame()
    expect(() => m.movePlayer(a, 1)).toThrow(/lobby/)
  })

  it('a Mex auto-commits the roll so the turn defaults to passing on', () => {
    const [a] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(2, 1)) // An: MEX on throw 1
    expect(m.state.round.rolls[a].committed).toBe(true)
    expect(m.state.round.maxThrows).toBe(1) // starter locking in caps the round
    expect(() => m.throwDice(dieRand(6, 5))).toThrow() // no more throws after a Mex
  })

  it('deals a double to a chosen player and counts it on their tally', () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(4, 4)) // An: double 4 → 4 sips to deal
    m.dealSips(b)
    expect(m.playerById(b).sips).toBe(4)
    expect(() => m.dealSips(a)).toThrow(/al uitgedeeld/) // one deal per throw
  })

  it('deals one sip for a returned 31 and resets the deal on the next throw', () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(3, 1)) // An: returned 31 → 1 sip
    m.dealSips(b)
    expect(m.playerById(b).sips).toBe(1)
    m.throwDice(dieRand(5, 5)) // re-throw into a double → may deal again
    m.dealSips(b)
    expect(m.playerById(b).sips).toBe(6) // 1 + 5
  })

  it('refuses to deal on a normal roll or a Mex', () => {
    const [, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5)) // normal 65
    expect(() => m.dealSips(b)).toThrow(/niets uit/)
  })

  it('bluff: a believed claim hands the claimed sips to the named player', () => {
    const [, b] = twoPlayers()
    m.setBluffMode(true)
    m.startGame()
    m.throwDice(dieRand(6, 5)) // no real double — pure bluff
    const out = m.resolveClaim(b, 6, false) // believed
    expect(out.kind).toBe('dealt')
    expect(m.playerById(b).sips).toBe(6)
  })

  it('bluff: a challenged bluff makes the thrower drink double the base sips', () => {
    const [a, b] = twoPlayers()
    m.setBluffMode(true)
    m.startGame()
    m.throwDice(dieRand(6, 5)) // no real double
    const out = m.resolveClaim(b, 6, true) // challenged
    expect(out.kind).toBe('caught')
    expect(m.playerById(a).sips).toBe(4) // 2 × base(2)
    expect(m.playerById(b).sips).toBe(0)
  })

  it('bluff: challenging a real double makes the challenger drink double the base sips', () => {
    const [a, b] = twoPlayers()
    m.setBluffMode(true)
    m.startGame()
    m.throwDice(dieRand(4, 4)) // real double
    const out = m.resolveClaim(b, 4, true) // wrong challenge
    expect(out.kind).toBe('wrongChallenge')
    expect(m.playerById(b).sips).toBe(4)
    expect(m.playerById(a).sips).toBe(0)
  })

  it('bluff: works on any throw, not just after committing', () => {
    const [, b] = twoPlayers()
    m.setBluffMode(true)
    m.startGame()
    m.throwDice(dieRand(3, 2)) // first of up to 3 throws, not committed
    expect(m.state.round.rolls[m.state.players[0].id].committed).toBe(false)
    m.resolveClaim(b, 5, false)
    expect(m.playerById(b).sips).toBe(5)
  })

  it('bluff: validates mode, value, target and one claim per throw', () => {
    const [a, b] = twoPlayers()
    m.startGame() // bluff off
    m.throwDice(dieRand(6, 5))
    expect(() => m.resolveClaim(b, 6, false)).toThrow(/blufmodus/)
    m.stopGame()
    m.setBluffMode(true)
    m.startGame()
    m.throwDice(dieRand(6, 5))
    expect(() => m.resolveClaim(b, 9, false)).toThrow(/1 tot 6/)
    expect(() => m.resolveClaim(a, 6, false)).toThrow(/andere speler/)
    m.resolveClaim(b, 6, false)
    expect(() => m.resolveClaim(b, 6, false)).toThrow(/al uitgedeeld/)
  })

  it('clamps base sips to 1..5', () => {
    m.setBaseSips(9)
    expect(m.state.settings.baseSips).toBe(5)
    m.setBaseSips(0)
    expect(m.state.settings.baseSips).toBe(1)
  })

  it('clamps pot per Mex to quarter steps within ¼..1 adje', () => {
    m.setPotPerMex(0.75)
    expect(m.state.settings.potPerMex).toBe(0.75)
    m.setPotPerMex(2)
    expect(m.state.settings.potPerMex).toBe(1)
    m.setPotPerMex(0)
    expect(m.state.settings.potPerMex).toBe(0.25)
    m.setPotPerMex(0.6)
    expect(m.state.settings.potPerMex).toBe(0.5)
  })

  it('startGame builds round 1 with the first player as starter', () => {
    const [a] = twoPlayers()
    m.startGame()
    expect(m.state.phase).toBe('playing')
    expect(m.state.round.number).toBe(1)
    expect(m.state.round.order[0]).toBe(a)
    expect(m.state.round.maxThrows).toBe(3)
  })

  it("staying early caps everyone else's throws", () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5)) // An: 65
    m.stay()
    expect(m.state.round.maxThrows).toBe(1)
    m.passTurn()
    m.throwDice(dieRand(4, 2)) // Bert: 42, auto-commits at cap 1
    expect(m.state.round.rolls[b].committed).toBe(true)
    expect(() => m.throwDice(dieRand(1, 1))).toThrow()
  })

  it('holding keeps one die and swaps the hold to the other on request', () => {
    const [a] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 2)) // [6,2]
    m.toggleHold(0)
    expect(m.state.round.rolls[a].held).toEqual([true, false])
    m.toggleHold(1) // swap
    expect(m.state.round.rolls[a].held).toEqual([false, true])
    m.toggleHold(0) // swap back, keep die 0 = 6
    m.throwDice(dieRand(4)) // rerolls only die 1
    expect(m.state.round.rolls[a].dice).toEqual([6, 4])
    expect(m.state.round.rolls[a].throwsUsed).toBe(2)
  })

  it('cannot hold before the first throw and cannot pass before committing', () => {
    twoPlayers()
    m.startGame()
    expect(() => m.toggleHold(0)).toThrow()
    expect(() => m.passTurn()).toThrow()
    expect(() => m.stay()).toThrow()
  })

  it('resolves the round: loser drinks base sips and result phase opens', () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5)) // An 65
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(4, 1)) // Bert 41 — auto-commit (cap 1)
    m.passTurn()
    expect(m.state.phase).toBe('result')
    expect(m.state.lastResult.loserId).toBe(b)
    expect(m.state.lastResult.sips).toBe(2)
    expect(m.state.lastResult.pot).toBe(0)
    expect(m.playerById(b).sips).toBe(2)
    expect(m.playerById(a).sips).toBe(0)
  })

  it('every thrown Mex fills the pot; the loser drinks it as adjes', () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(2, 1)) // An: MEX → +½ adje in the pot, auto-commits
    m.passTurn()
    m.throwDice(dieRand(4, 3)) // Bert 43 — auto-commit (cap 1)
    m.passTurn()
    expect(m.state.lastResult.loserId).toBe(b)
    expect(m.state.lastResult.sips).toBe(2) // base sips unaffected
    expect(m.state.lastResult.pot).toBe(0.5)
    expect(m.playerById(b).sips).toBe(2)
    expect(m.playerById(b).adjes).toBe(0.5)
    expect(m.playerById(a).adjes).toBe(0)
  })

  it('pot amount per Mex is configurable', () => {
    twoPlayers()
    m.setPotPerMex(1)
    m.startGame()
    m.throwDice(dieRand(2, 1)) // MEX — auto-commits
    m.passTurn()
    m.throwDice(dieRand(4, 3))
    m.passTurn()
    expect(m.state.lastResult.pot).toBe(1)
  })

  it('rolling 31 gives the throw back: not counted, never stands', () => {
    const [a] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(3, 1)) // 31 — returned
    expect(m.state.round.rolls[a].dice).toEqual([3, 1]) // dice stay visible
    expect(m.state.round.rolls[a].throwsUsed).toBe(0)
    expect(m.state.round.rolls[a].committed).toBe(false)
    expect(() => m.stay()).toThrow() // a returned throw is no throw
    m.throwDice(dieRand(1, 3)) // 31 again, in the other dice order — returned again
    expect(m.state.round.rolls[a].throwsUsed).toBe(0)
    m.throwDice(dieRand(6, 5)) // finally a real throw
    expect(m.state.round.rolls[a].throwsUsed).toBe(1)
    m.stay()
    expect(m.state.round.maxThrows).toBe(1) // returned throws don't set the cap
  })

  it('a returned 31 on the table cannot be committed by staying', () => {
    const [a] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(3, 5)) // 53 stands
    m.toggleHold(0) // hold the 3
    m.throwDice(dieRand(1)) // reroll die 1 → [3,1] = 31 → returned
    expect(m.state.round.rolls[a].throwsUsed).toBe(1)
    expect(() => m.stay()).toThrow(/31/)
    m.throwDice(dieRand(6)) // reroll again → [3,6] = 63 stands
    m.stay()
    expect(m.state.round.rolls[a].committed).toBe(true)
  })

  it('31 does not fill the pot and is not a Mex', () => {
    twoPlayers()
    m.startGame()
    m.throwDice(dieRand(3, 1)) // returned
    m.throwDice(dieRand(6, 5))
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(4, 1))
    m.passTurn()
    expect(m.state.lastResult.pot).toBe(0)
    expect(m.state.lastResult.mexCount).toBe(0)
  })

  it('ties trigger a one-throw roll-off until a single loser remains', () => {
    const [a, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(3, 2)) // An 32
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(2, 3)) // Bert 32 — tie
    m.passTurn()
    expect(m.state.phase).toBe('playing')
    expect(m.state.round.rolloffIds).toEqual([a, b])
    m.throwDice(dieRand(5, 4)) // An 54, auto-commit (roll-off cap 1)
    m.passTurn()
    m.throwDice(dieRand(3, 2)) // Bert 32
    m.passTurn()
    expect(m.state.phase).toBe('result')
    expect(m.state.lastResult.loserId).toBe(b)
  })

  it('the loser starts the next round', () => {
    const [, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(6, 5))
    m.stay()
    m.passTurn()
    m.throwDice(dieRand(4, 1))
    m.passTurn()
    m.nextRound()
    expect(m.state.phase).toBe('playing')
    expect(m.state.round.number).toBe(2)
    expect(m.state.round.order[0]).toBe(b)
    expect(m.state.round.maxThrows).toBe(3)
  })

  it('stopGame returns to lobby keeping tallies; newGame wipes them', () => {
    const [, b] = twoPlayers()
    m.startGame()
    m.throwDice(dieRand(2, 1)) // MEX → pot ½, auto-commits
    m.passTurn()
    m.throwDice(dieRand(4, 1))
    m.passTurn()
    m.stopGame()
    expect(m.state.phase).toBe('lobby')
    expect(m.playerById(b).sips).toBe(2)
    expect(m.playerById(b).adjes).toBe(0.5)
    m.newGame()
    expect(m.playerById(b).sips).toBe(0)
    expect(m.playerById(b).adjes).toBe(0)
  })

  it('persists to localStorage on the next tick', async () => {
    twoPlayers()
    await nextTick()
    expect(JSON.parse(localStorage.getItem(MEX_STORAGE_KEY)).players).toHaveLength(2)
  })

  it('sanitizeState downgrades structurally impossible stored states to a fresh lobby', () => {
    expect(sanitizeState({ phase: 'playing', players: [], round: null }).phase).toBe('lobby')
    expect(sanitizeState({ phase: 'result', players: [{ id: 'a' }, { id: 'b' }], round: {}, lastResult: null }).phase).toBe('lobby')
    const valid = sanitizeState({
      phase: 'lobby',
      players: [],
      settings: { baseSips: 3, potPerMex: 0.25 },
    })
    expect(valid.phase).toBe('lobby')
    expect(valid.settings.baseSips).toBe(3)
  })
})
