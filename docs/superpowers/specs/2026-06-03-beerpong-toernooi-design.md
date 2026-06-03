# Beerpong Toernooi — Design

**Date:** 2026-06-03
**Status:** Approved (user delegated decisions: "do everything autonomously")

## Purpose

A small web app to run a beer pong tournament evening with 8 people, hosted free on
GitHub Pages. The organiser runs it from a phone or laptop at the party.

## Requirements (from user)

- 8 people, teams of 2
- Max 4 games per team ("otherwise it takes too long")
- Random team generator
- Take pictures of team members; AI generates a ridiculous team photo of both members
- A final and a losers final

## Decisions made autonomously

| Decision | Choice | Why |
|---|---|---|
| UI language | Dutch (Flemish, playful tone) | Organiser and friends are Flemish; party app |
| Tournament format | Full round robin (6 games, 3 per team) + final (1v2) + losers final (3v4) | Every team plays **exactly 4 games** — meets the max-4 constraint with zero waste |
| Scoring | Pick winner + winner's cups remaining (1–10) | Beer pong's natural margin metric; drives tiebreaks |
| Standings tiebreak | Wins → cup saldo → head-to-head → name | Simple, transparent at a party |
| AI images | Google Gemini Interactions API (`gemini-3.1-flash-image`), user-supplied API key, called directly from the browser | Only way to do AI on a static host; Gemini has a free tier; key stored in localStorage, never committed |
| No AI key fallback | Show the two member photos side-by-side in the team card | Graceful degradation |
| Stack | Vite + Vue 3 (Composition API) + Tailwind CSS v4 | User preference (Vue + Tailwind) |
| Routing | None — phase-based screens in one SPA | 5 screens, linear flow; router is overhead |
| State | Reactive store composable + localStorage persistence | Survives page refresh mid-tournament; no backend |
| Photos | Downscaled client-side (players 512px JPEG, AI photos 768px JPEG) before storage | Stay well under the ~5MB localStorage quota |
| Hosting | GitHub Pages via GitHub Actions workflow | Free, automatic deploy on push |
| Repo | `mroedolf/beerpong-toernooi`, public | Pages free tier requires public repo |
| Testing | Vitest on pure tournament logic; Playwright smoke test before deploy | Logic correctness matters most; UI verified by walking the real flow |

## Tournament flow

```
setup ──► teams ──► group ──► finals ──► podium
```

1. **Setup** (`SetupScreen`): enter 8 players, each with name + photo (camera or file
   upload). Gemini API key field (optional, stored locally). "Maak teams" enabled at
   exactly 8 players.
2. **Teams** (`TeamsScreen`): shuffle animation reveals 4 random teams of 2. Each team
   gets an auto-generated ridiculous Dutch team name (re-rollable, editable). Per team:
   "Genereer teamfoto" calls Gemini with both member photos + a random absurd scenario;
   re-roll allowed. Start group stage from here.
3. **Group stage** (`MatchesScreen`): 6 round-robin matches in fixed order
   `AB, CD, AC, BD, AD, BC` (no team ever plays twice in a row). Tap a match → pick
   winner + cups remaining. Live standings table below. When all 6 are played →
   "Naar de finales".
4. **Finals** (`FinalsScreen`): Final = #1 vs #2, Losers final = #3 vs #4. Same score
   entry.
5. **Podium** (`PodiumScreen`): champion celebration with confetti, AI team photos,
   final ranking 1–4 (loser-final winner is #3).

Back-navigation via a small nav; a guarded "Reset toernooi" wipes state.

## Architecture

```
src/
  main.js
  App.vue                      # phase switch + nav + toast host
  store/tournament.js          # reactive store, actions, localStorage persistence
  lib/schedule.js              # pure: makeTeams, roundRobin, standings, finalsPairings, finalRanking
  lib/names.js                 # pure: ridiculous team name + AI scenario generators
  lib/images.js                # file→dataURL, canvas downscale/re-encode
  lib/gemini.js                # Interactions API client (fetch, x-goog-api-key)
  components/
    screens/{Setup,Teams,Matches,Finals,Podium}Screen.vue
    ui/  (TeamCard, MatchCard, ScoreDialog, PlayerAvatar, StandingsTable, ...)
```

### Data model (persisted as one localStorage JSON blob, `beerpong:v1`)

```js
{
  phase: 'setup'|'teams'|'group'|'finals'|'podium',
  players: [{ id, name, photo /* dataURL|null */ }],          // 8
  teams:   [{ id, name, playerIds: [a, b], aiPhoto, scenario }], // 4
  groupMatches: [{ id, teamA, teamB, winnerId|null, cupsLeft|null }], // 6
  finalMatch:  { teamA, teamB, winnerId|null, cupsLeft|null } | null,
  losersMatch: { teamA, teamB, winnerId|null, cupsLeft|null } | null,
}
```

API key lives in its own key `beerpong:apikey` (kept out of any export/share path).

### Pure logic (unit-tested)

- `makeTeams(playerIds, rand)` — Fisher–Yates shuffle, chunk into 4 pairs.
- `roundRobin(teamIds)` — fixed 6-match order, no back-to-back games for any team.
- `standings(teams, matches)` — wins → cup saldo (winner +cupsLeft / loser −cupsLeft)
  → head-to-head → name. Returns ranked list with stats.
- `finalsPairings(ranked)` — `{final: [1,2], losersFinal: [3,4]}`.
- `finalRanking(...)` — podium order 1–4 after finals.

### Gemini client

`POST https://generativelanguage.googleapis.com/v1beta/interactions` with headers
`x-goog-api-key` + `Api-Revision: 2026-05-20`. Input: two image blocks (base64 JPEG)
+ text prompt (English, embeds team name + random scenario, asks for one funny
photorealistic image of both people). `response_format: {type:'image', aspect_ratio:'4:3', image_size:'1K'}`.
Response parsing: find last `image` content block in `model_output` steps. Errors map
to friendly Dutch toasts (invalid key / quota / network); generation is per-team
re-entrant with a spinner state, result re-encoded to 768px JPEG before storage.

## Error handling

- localStorage write failure → toast, app keeps working in memory.
- Corrupt/old persisted state → versioned key, fall back to fresh state.
- Image too large / unreadable → toast, keep previous photo.
- Gemini errors → toast with reason, button returns to idle, re-try allowed.
- Refresh mid-tournament → state restored from localStorage.

## Visual direction

Mobile-first, party-grade: dark backdrop, red-solo-cup red + beer amber accents, big
display typography for scores, playful Dutch copy, confetti on the podium. Distinctive
design per the frontend-design skill (no generic AI-slop layout).

## Deploy

- `vite.config.js` with `base: '/beerpong-toernooi/'`.
- `.github/workflows/deploy.yml`: on push to main → build → `actions/deploy-pages`.
- Live at `https://mroedolf.github.io/beerpong-toernooi/`.

## Out of scope (YAGNI)

Multi-device sync, >8 players, PWA/offline install, editing teams after group stage
starts, i18n, accounts.
