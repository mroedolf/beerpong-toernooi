# Drankspelen Site Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand to a general drinking-game site ("Drankspelen") with a hash-routed landing page selecting between Beerpong Toernooi and Mex.

**Architecture:** Tiny hash router (`src/lib/router.js`), static game registry (`src/games.js`), landing page with live-status game cards (`HomeScreen.vue`), beerpong phase logic extracted from `App.vue` into `BeerpongGame.vue`; `App.vue` becomes header + route switch.

**Tech Stack:** existing (Vue 3, Tailwind v4, Vitest). No new dependencies.

---

### Task 1: Hash router (TDD) + game registry

**Files:** Create `src/lib/router.js`, `src/lib/router.test.js`, `src/games.js`.

- [ ] **Step 1: failing tests** (`src/lib/router.test.js`)

```js
import { describe, it, expect } from 'vitest'
import { useRoute, navigate } from './router.js'

function fireHash(hash) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('hash router', () => {
  it('treats empty or slash-less hashes as the landing route', () => {
    const { path } = useRoute()
    fireHash('')
    expect(path.value).toBe('/')
    fireHash('#garbage')
    expect(path.value).toBe('/')
  })
  it('follows hash changes reactively', () => {
    const { path } = useRoute()
    fireHash('#/mex')
    expect(path.value).toBe('/mex')
    fireHash('#/beerpong')
    expect(path.value).toBe('/beerpong')
  })
  it('navigate() sets the location hash', () => {
    navigate('/mex')
    expect(window.location.hash).toBe('#/mex')
  })
})
```

- [ ] **Step 2:** run `npx vitest run src/lib/router.test.js` → FAIL (unresolvable).
- [ ] **Step 3: implement** (`src/lib/router.js`)

```js
import { ref } from 'vue'

// Minimal hash router: '#/mex' → '/mex'; anything without a leading slash → '/'.
function normalize(hash) {
  const path = hash.replace(/^#/, '')
  return path.startsWith('/') ? path : '/'
}

const path = ref(normalize(window.location.hash))

window.addEventListener('hashchange', () => {
  path.value = normalize(window.location.hash)
})

export function navigate(to) {
  window.location.hash = '#' + to
}

export function useRoute() {
  return { path, navigate }
}
```

- [ ] **Step 4: implement** (`src/games.js`)

```js
// Registry of available games — the landing page and routes derive from this.
export const GAMES = [
  {
    id: 'beerpong',
    path: '/beerpong',
    emoji: '🏆',
    name: 'Beerpong Toernooi',
    tagline: 'Vier teams, zes games, één kampioen.',
    players: '8 spelers · teams van 2',
  },
  {
    id: 'mex',
    path: '/mex',
    emoji: '🎲',
    name: 'Mex',
    tagline: 'Laagste worp drinkt. En de pot loert.',
    players: '2+ spelers',
  },
]
```

- [ ] **Step 5:** run tests → PASS. Commit `feat: hash router + game registry`.

### Task 2: BeerpongGame wrapper, HomeScreen, App shell, branding

**Files:** Create `src/components/screens/BeerpongGame.vue`, `src/components/screens/HomeScreen.vue`; rewrite `src/App.vue`; modify `index.html` (title), `README.md`.

- [ ] **Step 1: `BeerpongGame.vue`** — move the phase-switch map, `phaseLabels`, `activeIndex` and the dots strip out of `App.vue` verbatim; render dots as a centered strip above `<component :is="current" />`. Imports use `./` (same `screens/` dir).
- [ ] **Step 2: `HomeScreen.vue`** — hero ("Kies je spel"), one sticker-tilted card per `GAMES` entry (emoji, name `font-display`, tagline, players line, live status badge), teaser card "🤫 Binnenkort". Live status: beerpong from tournament phase (`group` → "Groepsfase — X/6 gespeeld" via `isPlayed`, `teams`/`finals`/`podium` labels, `setup` → none) and Mex from `m.state.phase !== 'lobby'` → "Ronde N bezig" else player count. Card click → `navigate(g.path)`.
- [ ] **Step 3: `App.vue`** — header: wordmark `🍻 DRANKSPELEN` (click → `navigate('/')`) + "‹ Spellen" pill on non-home routes; main: route map `{'/': HomeScreen, '/beerpong': BeerpongGame, '/mex': MexScreen}` with `?? HomeScreen` fallback. Old `view` toggle and tournament imports removed.
- [ ] **Step 4:** `index.html` title → `Drankspelen 🍻`; README intro updated to describe the site + Mex.
- [ ] **Step 5:** `npm test && npm run build` → all green. Commit `feat: Drankspelen landing page with hash-routed game selection`.

### Task 3: Verify & deploy

- [ ] Browser smoke: landing shows both cards + statuses; card → game; wordmark/pill → back; browser back button returns to landing; `#/garbage` → landing; running tournament state intact.
- [ ] Code review subagent over the new commits; fix critical/important.
- [ ] Push; verify Actions run success + live bundle hash.
