# Drankspelen — site shell & landing page — Design

**Date:** 2026-06-05
**Status:** Approved (autonomous mode)

## Purpose

Turn the single-purpose beerpong app into a general drinking-game site: a landing
page where you pick a game (Beerpong Toernooi, Mex, more later), with each game as a
self-contained module behind its own route.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Routing | Hand-rolled hash router (`#/`, `#/beerpong`, `#/mex`), ~25 lines | No dependency for 3 routes; phone back-button works (hashchange); GitHub Pages safe; unknown hash → landing |
| Repo/URL | Unchanged (`beerpong-toernooi`) | The link friends already have keeps working; only the UI rebrands |
| Branding | Wordmark `🍻 DRANKSPELEN`, document title "Drankspelen 🍻" | General site identity, same party design language |
| Shell/game split | `App.vue` = header + route switch only; beerpong's phase logic moves to `BeerpongGame.vue` (incl. phase dots as its own strip) | Shell knows nothing about game internals; games are modules |
| Game registry | `src/games.js` — static list {id, path, emoji, name, tagline, players} | Landing + routes derive from one source; adding a game = one entry + one component |
| Landing cards | Sticker-style card per game with emoji, name, tagline, players line, and a LIVE status line from the game's store ("Groepsfase — 4/6 gespeeld", "Ronde 3 bezig", "Afgelopen 🏆") + muted "Binnenkort… 🤫" teaser card | The landing reflects the party's state, not a static menu |
| Header in games | Wordmark links home (`#/`); games render their own sub-context (beerpong dots strip; Mex nothing) | One back affordance, no per-game header clutter |
| State | Existing localStorage keys untouched | Running tournament/Mex games survive the restructure |

## Architecture

```
src/lib/router.js          # path ref + navigate() + hashchange sync (unit-tested)
src/games.js               # game registry (static data)
src/components/screens/HomeScreen.vue    # landing: game cards + teaser
src/components/screens/BeerpongGame.vue  # moved phase-switch + phase dots strip
src/App.vue                # header (wordmark→home) + route switch via registry
index.html                 # title "Drankspelen 🍻"
README.md                  # describes the site + both games
```

Route map: `/` → HomeScreen, `/beerpong` → BeerpongGame, `/mex` → MexScreen
(existing), anything else → HomeScreen.

## Error handling

Unknown/garbled hash falls back to the landing page. No other new failure modes —
router is pure browser-event plumbing.

## Testing

- `src/lib/router.test.js` — normalize (empty/`#`/`#/mex`/garbage), navigate sets
  hash, hashchange updates the reactive path (jsdom fires hashchange on hash set).
- Existing 70 tests untouched; browser smoke: landing → beerpong → back → mex →
  back-button behavior, live status lines.

## Out of scope (YAGNI)

vue-router, per-route document titles, transitions between routes, more games,
repo rename.
