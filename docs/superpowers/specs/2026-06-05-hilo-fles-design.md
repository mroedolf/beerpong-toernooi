# Hoger Lager + De Fles — Design

**Date:** 2026-06-05
**Status:** Approved (autonomous mode; user asked for "extra spelen", games chosen autonomously)

## Game 4 — 🎴 Hoger Lager (`/hogerlager`, id `hilo`)

Guess whether the next card is higher or lower; the group's streak escalates the
punishment.

**Rules (in-app panel):**
- Om de beurt: raad of de volgende kaart **hoger** of **lager** is dan de
  huidige. 2 is de laagste, aas de hoogste. **Gelijk telt als fout.**
- Goed → de reeks groeit met 1 en de volgende speler is aan de beurt.
- Fout → drink **reeks + 1** slokken; de reeks valt terug op nul.
- Stapel op? Automatisch opnieuw geschud.
- Geen vast einde — stop wanneer jullie genoeg hebben; het schandebord onthoudt.

**Implementation:**
- `src/lib/hilo.js` (pure, tested): `RANK_VALUES` (2..10 numeriek, B=11, V=12,
  K=13, A=14), `isCorrect(prev, next, guess)` (strict; equal = wrong). Deck
  building reuses `buildDeck`/`SUITS`/`RANKS` from `lib/cod.js`.
- `src/store/hilo.js` (tested, patterns of mex/cod): state `{ phase lobby|playing,
  players [{id,name,sips}], deck, current, streak, turnIndex, lastOutcome
  { correct, prevCard, nextCard, drinkerId, sips } | null }`. Actions: `addPlayer`
  / `removePlayer` / `importPlayers` (lobby only), `startGame(rand?)` (≥2 players;
  shuffled deck, pop first `current`), `guess('hoger'|'lager', rand?)` (pop next;
  correct → streak+1; wrong → guesser `sips += streak+1`, streak=0; always:
  current=next, turn advances; empty deck → fresh shuffled deck), `stopGame`
  (lobby, tallies kept), `newGame` (tallies reset, lobby), `sanitizeState`,
  persistence `hilo:v1`.
- UI: `HiloLobby` (players/import/rules/start — Mex-lobby pattern),
  `HiloTable` (current card via shared `PlayingCard`, big Hoger ⬆️ / Lager ⬇️
  buttons, streak counter "Reeks: 4", outcome flash "Fout! 9♥ → 7♣ — drink 3",
  schandebord, stop), `HiloScreen` switch.

## Game 5 — 🍾 De Fles (`/fles`, id `fles`)

Digital spin-the-bottle: the bottle spins with dramatic deceleration and points
at a player. Doubles as a who-starts picker for every other game.

**Implementation:**
- `src/store/fles.js` (tested): state `{ players [{id,name}], lastPickedId }`,
  actions `addPlayer`/`removePlayer`/`importPlayers` (always allowed — no game
  state to corrupt), `spin(rand?)` (≥2 players; uniform pick, sets
  `lastPickedId`, returns the player), persistence `fles:v1`. No phases.
- UI: `FlesScreen` — players arranged in a circle (name chips at
  `i × 360/n` degrees), 🍾 in the center rotating via CSS transition
  (~3s, strong ease-out, 3–5 extra full turns computed in the component),
  result banner "🍾 wijst naar {naam}!", player add/remove + import below.
  The pointing angle derives from the picked index; the store stays
  animation-free.

## Shared

- `src/components/ui/PlayingCard.vue` — extracted card face (props
  `{ card: {rank, suit} }`): foam card, rank+suit corners, big center suit,
  red ♥♦ / dark ♠♣. `CodTable` refactors to use it (flip wrapper + king ring
  stay in CodTable); `HiloTable` uses it directly.
- `games.js` + `App.vue` routes + HomeScreen statuses
  (hilo: "Reeks 3 · 12 kaarten over" when playing, else players-ready count;
  fles: "Laatst: {naam} 🍾" else players count).
- README gets both games.

## Testing

hilo lib: rank ordering (A high, 2 low), isCorrect matrix incl. equal-is-wrong.
hilo store: full guess flow (correct/wrong/equal), sips escalation, reshuffle on
empty deck, lobby guards, sanitize, persistence. fles store: player management,
uniform pick with seeded rand, min-2 guard, persistence. CodTable refactor: existing
cod tests stay green (component is presentational; no store change).

## Out of scope (YAGNI)

Bussen (piramide/bus rounds), suit-guess bonus rounds, fles physics/audio,
weighted spins, prompts on the bottle result.
