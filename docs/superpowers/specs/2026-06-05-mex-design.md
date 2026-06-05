# Mex (Mexico) — Design

**Date:** 2026-06-05
**Status:** Approved (user delegated decisions: autonomous mode; user confirmed the game is "also called Mexico")

## Purpose

Add the classic Flemish/Dutch two-dice drinking game **Mex / Mexico** to the
beerpong-toernooi app, as the side-game for the same party night: digital dice,
turn-based rounds, and a running sips tally ("schandebord").

## Placement — approaches considered

1. **Integrated view in the existing app (chosen).** A 🎲 toggle in the header swaps
   between the tournament and Mex. Same URL the guests already have, same design
   system, zero new infra, tournament state untouched.
2. Separate repo + second Pages site — clean isolation, but a second URL, duplicated
   design/deploy for a mini-game. Rejected.
3. Multi-page build in the same repo (`/mex.html`) — splits bundle and navigation for
   no real gain at this size. Rejected.

## Amendment 2026-06-05 — huisregels v2 (user-specified)

User-requested extra rules, replacing the provisional "Mex verdubbelt" toggle:

1. **Mex → pot**: every thrown Mex (roll-offs included) adds a configurable amount to
   *de pot* — ¼, ½ (default), ¾ or 1 **adje** per Mex, set in the lobby. The round's
   loser drinks the pot on top of the base slokken; the pot then empties. Players get
   an `adjes` tally next to `sips` on the schandebord.
2. **Dubbels uitdelen**: a double d-d still scores as honderdtal AND the thrower may
   deal out d slokken. The app announces ("Deel d slokken uit 🍻"); recipients are
   chosen at the table, not tracked.
3. **31 → worp terug**: rolling 31 means the thrower deals 1 slok and gets the throw
   back — automatic: announced, `throwsUsed` not incremented, the roll never stands
   (so 31 can't be a final score and can't set the starter's cap). Applies in
   roll-offs too.

Storage key bumps to `beerpong:mex:v2` (settings schema changed; shallow merge of v1
state would leave `potPerMex` undefined). `toggleMexDoubles`/`mexDoubles` are removed;
`setPotPerMex` added. New pure helper `formatAdjes` renders ¼/½/¾ fractions.

## Rules implemented (classic Mexico; shown in an in-app info panel)

- Two dice per throw. Score ranking, high → low:
  - **Mex** = 2 & 1 — beats everything.
  - **Doubles** = honderdtallen: 6-6=600 … 1-1=100 — every double beats every normal roll.
  - **Normal** = higher die ×10 + lower die: 65 is the best, 31 the worst.
- A round: the **starter** (voorgooier) throws up to 3 times and may stop early
  ("blijven staan"); the number of throws they used caps everyone after them that round.
- Between throws a player may **hold one die** (tap to lock; not both — locking both
  is just staying).
- When everyone has thrown: **lowest score drinks**. Sips = `baseSips` (default 2),
  **doubled for every Mex thrown during the round** (including roll-offs) when the
  "Mex verdubbelt" setting is on.
- Tie for lowest → **roll-off**: tied players each get one throw (hold rules don't
  apply); repeat until one loser remains. Roll-off throws can also be Mex.
- The loser becomes the starter of the next round. Round 1 starts with the first
  player in the list.

## Players & settings

- Mex players are independent of tournament players: quick name entry, min 2, no max,
  add/remove only in the lobby (between games). One-tap "Neem toernooispelers over"
  appears when the tournament has players.
- Settings (lobby only): base sips stepper 1–5 (default 2), "Mex verdubbelt" toggle
  (default on). YAGNI: no other variants.
- Sips tally per player persists across rounds; "Nieuw spel" resets tallies (guarded
  by confirm, like the tournament reset).

## Architecture

```
src/lib/mex.js              # pure: dice scoring/compare, no Vue (unit-tested)
src/store/mex.js            # reactive store + persistence 'beerpong:mex' (unit-tested)
src/components/screens/MexScreen.vue   # subview switch: lobby | playing | result
src/components/mex/MexLobby.vue        # players, settings, rules info panel, start
src/components/mex/MexTurn.vue         # current thrower: dice, throw/hold/stay
src/components/mex/MexResult.vue       # round ranking, loser, sips, next round
src/components/mex/MexDie.vue          # CSS dot-face die, tumble animation, hold state
src/App.vue                 # adds view toggle: 'toernooi' | 'mex' (header 🎲 button)
```

### `src/lib/mex.js` (pure)

- `rollDie(rand?)` → 1–6 (crypto-backed default).
- `scoreRoll(d1, d2)` → `{ rank, label, isMex, isDouble }`; rank: Mex=10000,
  doubles=660+die (661–666), normal=hi*10+lo. Label: `"MEX!"`, `"600"`…`"100"`, `"53"`.
- `lowestOf(entries)` → ids with the minimal rank (input `[{id, rank}]`).
- `sipsFor(baseSips, mexCount, mexDoubles)` → `baseSips * 2^mexCount` or `baseSips`.

### `src/store/mex.js`

State: `phase ('lobby'|'playing'|'result')`, `players [{id, name, sips}]`,
`settings {baseSips, mexDoubles}`, `round {number, starterId, maxThrows, mexCount,
order [ids], turnIndex, rolls {id: {dice, held, throwsUsed, committed}},
rolloffIds|null}`, `lastResult {loserId, sips, ranking}`.

Actions: `addPlayer`, `removePlayer`, `importPlayers`, `setBaseSips`,
`toggleMexDoubles`, `startGame`, `throwDice`, `toggleHold(i)`, `stay`,
`nextRound`, `newGame (reset tallies → lobby)`. Persistence and validation follow the
tournament store pattern (versioned key, watch + try/catch, Dutch error messages
via thrown `Error` → caught in UI → `toast`).

Turn mechanics in the store (not the UI): auto-commit at the throw cap; starter's
`throwsUsed` fixes `round.maxThrows`; when all committed → either `result` phase or
roll-off (round.rolloffIds set, those players re-enter the turn cycle with 1 throw).

## UI flow

- Header toggle: `🎲 MEX` ↔ `🍺 TOERNOOI` pill button right of the wordmark; phase
  dots hidden in Mex view. Tournament state is never touched by Mex.
- **Lobby**: title "Mex 🎲", player list with sips badges, name input, import button,
  settings, collapsible "Hoe werkt het?" rules panel, CTA "Gooi de eerste ronde →"
  (disabled < 2 players, helper text).
- **Turn**: "Ronde N" + thrower name huge, two big dice (tap = hold/unhold, locked
  shows 🔒 ring), throw counter as beer caps (●●○), buttons "Gooi 🎲" /
  "Blijven staan ✋" (the latter after ≥1 throw), live score label after each throw
  ("MEX!!!" gets a screen-wide stamp + shake — the signature moment).
- **Result**: ranking high→low with score labels, loser highlighted in `cup`,
  "{naam} drinkt {n} slokken 🍺" (with "×2 per Mex" note when applicable), sips
  tally list, CTA "Volgende ronde →" (loser starts), secondary "Stop het spel"
  (→ lobby, tallies kept).
- Design language: existing brutalist-party system (night/cup/beer/foam tokens,
  font-display, sticker tilts, hard shadows, staggered entrances, 44px+ targets).
  Dice are foam-white with night pips, oversized (~96px), tumble animation ~500ms.

## Error handling

Same approach as the tournament: store throws Dutch `Error`s (e.g. "Minstens 2
spelers nodig"), UI catches → `toast`; persistence wrapped in try/catch; corrupt
stored state falls back to fresh lobby.

## Testing

- `src/lib/mex.test.js` — scoring table (Mex > 600 > … > 100 > 65 > … > 31), label
  formatting, lowestOf ties, sips doubling math.
- `src/store/mex.test.js` — full round: start, throw-cap inheritance from starter,
  hold behavior, auto-commit, loser & tally, Mex doubling, roll-off path, loser
  starts next round, persistence round-trip, lobby validations.
- Browser smoke test of the full loop before deploy.

## Out of scope (YAGNI)

Sounds, dice physics/3D, more house variants (doorgooien, vasthoud-verbod, 31-regel),
player stats history, multi-device play, separate Mex URL.
