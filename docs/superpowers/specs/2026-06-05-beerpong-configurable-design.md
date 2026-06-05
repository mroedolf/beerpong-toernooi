# Beerpong toernooi — configureerbaar — Design

**Date:** 2026-06-05
**Status:** Approved (autonomous mode)

## Purpose

Make the beerpong tournament configurable instead of hard-wired to 8 players /
10 cups / mandatory losers final.

## Configurable options (Toernooi-instellingen on the setup screen)

| Option | Range | Default | Notes |
|---|---|---|---|
| Aantal spelers | 4–16, even (teams of 2 stay) | — | 2–8 teams; CTA enables on any valid count; live preview "Y teams · Y−1 groepsgames per team + finale" |
| Bekers per game | 6 of 10 | 10 | Drives `recordResult` validation and the ScoreDialog stepper max |
| Verliezersfinale | aan/uit | aan | Forced off (and control hinted) below 4 teams |

Settings are mutable while phase ∈ {setup, teams, group}; the only UI for them
lives on the setup screen. The original "max 4 games per team" guarantee holds
specifically at 8 players; with other sizes the setup preview makes the cost
explicit and the organizer decides.

## Format

Single round robin (all team counts) + finale (#1 vs #2) + optional
verliezersfinale (#3 vs #4). No multi-group brackets (YAGNI — revisit if a
16-player evening actually happens and 7 games per team proves too long).

## Logic changes (`src/lib/schedule.js`)

- `makeTeams(playerIds)` — accepts any even 4–16 (Dutch error otherwise).
- `roundRobin(teamIds)` — N teams: 4 keeps the current hand-tuned order; others
  use the circle method (bye for odd N), flattened round-by-round with a
  boundary de-clash pass (move a disjoint match to the round's front). No team
  plays twice in a row for even N; for odd N it's best-effort (provably
  impossible at 3 teams).
- `finalsPairings(ranked, includeLosersFinal)` — `losersFinal: null` when off
  or fewer than 4 teams.
- `finalRanking(finalMatch, losersMatch|null, ranked)` — full podium order:
  final winner/loser, then losers-final winner/loser (when played), then the
  remaining teams in group-standings order.
- (store) `mergeState(parsed, fresh)` exported from `tournament.js` — deep-merges
  `settings` so the existing `beerpong:v1` blob (without settings) upgrades
  without wiping a running tournament.

## Store changes (`src/store/tournament.js`)

- `state.settings = { cupsPerGame: 10, losersFinal: true }` (+ deep-merge load).
- `addPlayer` cap 16. `buildTeams` validates via `makeTeams`.
- `recordResult` cups 1..`settings.cupsPerGame`.
- `groupDone()` — all generated matches played (no hardcoded 6).
- `startFinals()` — `losersMatch` may be `null`. `finishTournament()`/`podium()`
  handle that.
- New actions `setCupsPerGame(6|10)`, `toggleLosersFinal()` (allowed until finals).

## UI changes

- **SetupScreen**: count-flexible header ("X spelers" + cup row grows per player,
  odd count shows one ghost cup as the missing partner), CTA enabled on even
  4–16 with format preview, "Toernooi-instellingen" fieldset (cups pills 6/10,
  verliezersfinale checkbox with "vanaf 4 teams" hint), input locks at 16.
- **ScoreDialog**: stepper max from settings; prefill clamped to the max.
- **MatchesScreen**: "X / {total} gespeeld" and CTA helper derived from the
  actual match count.
- **FinalsScreen**: losers-final section only when `losersMatch` exists (else a
  one-line note); CTA requires only the matches that exist.
- **PodiumScreen**: guard + ranking handle `losersMatch === null` and >4 or <4
  teams (medals beyond top-3 fall back to 🍺; 4th-place quip only when there is
  a 4th).
- **HomeScreen/games.js**: dynamic "X/Y gespeeld" status; players copy
  "4–16 spelers · teams van 2".

## Testing

Schedule: team-making bounds; round robin for 2–8 teams (every pairing once,
per-team counts, unique ids, no-consecutive assert for even N); finals pairing
flag/size matrix; final ranking with and without losers final; mergeState.
Store: player cap, cups validation follows setting, 6-player flow to podium with
losers final auto-off, groupDone without hardcoded count, settings defaults.

## Out of scope (YAGNI)

Teams of 3+, multi-group brackets, best-of finals, per-match cup counts,
back-navigation to setup after teams are made.
