# Beerpong Toernooi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first Vue 3 + Tailwind v4 SPA on GitHub Pages that runs an 8-person beer pong tournament: random teams of 2, AI-generated ridiculous team photos (Gemini), 6-game round robin, final + losers final, podium.

**Architecture:** Phase-based SPA (`setup → teams → group → finals → podium`), one reactive store persisted to localStorage, pure tournament logic in `src/lib/` (unit-tested), browser-direct Gemini Interactions API client. Deployed via GitHub Actions to Pages.

**Tech Stack:** Vite 7, Vue 3.5 (Composition API, `<script setup>`), Tailwind CSS v4 (`@tailwindcss/vite`), Vitest + jsdom, canvas-confetti, gh CLI for repo/Pages.

**Execution notes (adapted for parallel subagents):**
- Tasks 2–4 are independent after Task 1. Tasks 6–9 are independent after Task 5 — each touches only its own files. UI agents follow the design conventions established in Task 6's `src/style.css` and App shell.
- Subagents do NOT run `git commit` (parallel agents would race); the orchestrator commits after each phase. Step-level "Commit" lines below become orchestrator checkpoints.
- UI language is DUTCH (Flemish, playful). All user-facing copy in Dutch.

---

### Task 1: Scaffold — Vite + Vue + Tailwind + Pages workflow

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `README.md`
- Create: `src/main.js`, `src/style.css`, `src/App.vue` (minimal placeholder, replaced in Task 6)
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "beerpong-toernooi",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "canvas-confetti": "^1.9.3",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.4",
    "@vitejs/plugin-vue": "^5.2.3",
    "jsdom": "^26.0.0",
    "tailwindcss": "^4.1.4",
    "vite": "^6.3.5",
    "vitest": "^3.1.1"
  }
}
```

(Vite is pinned to the 6.x line: `@vitejs/plugin-vue` 5.x and `@tailwindcss/vite` 4.1.x both declare Vite 5/6 peers; Vite 7 would need coordinated major bumps for no benefit here.)

- [ ] **Step 2: Write `vite.config.js`**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/beerpong-toernooi/',
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#16100b" />
    <title>Beerpong Toernooi 🍺</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍺</text></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `src/style.css`** (Tailwind v4 theme tokens — Task 6 may extend, not replace)

```css
@import "tailwindcss";

@theme {
  --color-cup: #e03c31;        /* red solo cup */
  --color-cup-dark: #a92a22;
  --color-beer: #f6a623;       /* amber */
  --color-foam: #fdf3e0;       /* foam white */
  --color-night: #16100b;      /* page background */
  --color-night-soft: #241a12; /* card background */
  --color-line: #3a2c1e;       /* borders */
  --font-display: "Lilita One", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
}

body {
  background-color: var(--color-night);
  color: var(--color-foam);
  font-family: var(--font-sans);
}
```

- [ ] **Step 5: Write `src/main.js`**

```js
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 6: Write placeholder `src/App.vue`** (replaced in Task 6)

```vue
<script setup>
</script>

<template>
  <main class="min-h-dvh grid place-items-center">
    <h1 class="font-display text-4xl text-beer">Beerpong Toernooi 🍺</h1>
  </main>
</template>
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules
dist
.DS_Store
*.local
```

- [ ] **Step 8: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 9: Write `README.md`**

```markdown
# Beerpong Toernooi 🍺

Toernooi-app voor 8 spelers: willekeurige teams van 2, groepsfase (round robin),
finale + verliezersfinale, en AI-gegenereerde belachelijke teamfoto's.

**Live:** https://mroedolf.github.io/beerpong-toernooi/

## Lokaal draaien

​```bash
npm install
npm run dev
​```

## AI-teamfoto's

Optioneel: vul een [Gemini API key](https://aistudio.google.com/apikey) in op het
setup-scherm. De key blijft in localStorage van je browser en verlaat je toestel
alleen richting de Google API.

## Formaat

- 8 spelers → 4 willekeurige teams van 2
- Groepsfase: volledige round robin (6 wedstrijden, 3 per team)
- Finale (#1 vs #2) en verliezersfinale (#3 vs #4) → elk team speelt exact 4 games
- Stand: winsten → bekersaldo → onderling resultaat
```

(Remove the zero-width escapes around the inner code fence when writing the real file.)

- [ ] **Step 10: Install and verify**

Run: `npm install && npm run build`
Expected: build succeeds, `dist/` created.

- [ ] **Step 11: Orchestrator commit** — `chore: scaffold Vite + Vue + Tailwind + Pages deploy`

---

### Task 2: Pure tournament logic — `src/lib/schedule.js` (TDD)

**Files:**
- Create: `src/lib/schedule.js`
- Test: `src/lib/schedule.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest'
import { makeTeams, roundRobin, standings, finalsPairings, finalRanking, isPlayed } from './schedule.js'

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }

describe('makeTeams', () => {
  it('throws unless exactly 8 players', () => {
    expect(() => makeTeams(['a', 'b'])).toThrow()
    expect(() => makeTeams(Array.from({ length: 9 }, (_, i) => `p${i}`))).toThrow()
  })
  it('returns 4 pairs covering all 8 ids exactly once', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const teams = makeTeams(ids)
    expect(teams).toHaveLength(4)
    expect(teams.every(t => t.length === 2)).toBe(true)
    expect(teams.flat().sort()).toEqual([...ids].sort())
  })
  it('is deterministic given a seeded rand', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const a = makeTeams(ids, seq(0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.6))
    const b = makeTeams(ids, seq(0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.6))
    expect(a).toEqual(b)
  })
})

describe('roundRobin', () => {
  const matches = roundRobin(['A', 'B', 'C', 'D'])
  it('creates 6 unplayed matches, each team playing 3', () => {
    expect(matches).toHaveLength(6)
    expect(matches.every(m => !isPlayed(m))).toBe(true)
    for (const t of ['A', 'B', 'C', 'D']) {
      expect(matches.filter(m => m.teamA === t || m.teamB === t)).toHaveLength(3)
    }
  })
  it('covers every pairing exactly once', () => {
    const keys = matches.map(m => [m.teamA, m.teamB].sort().join('-')).sort()
    expect(keys).toEqual(['A-B', 'A-C', 'A-D', 'B-C', 'B-D', 'C-D'])
  })
  it('never schedules a team in two consecutive matches', () => {
    for (let i = 1; i < matches.length; i++) {
      const prev = [matches[i - 1].teamA, matches[i - 1].teamB]
      expect(prev).not.toContain(matches[i].teamA)
      expect(prev).not.toContain(matches[i].teamB)
    }
  })
})

describe('standings', () => {
  const teams = [
    { id: 'A', name: 'Alfa' }, { id: 'B', name: 'Bravo' },
    { id: 'C', name: 'Charlie' }, { id: 'D', name: 'Delta' },
  ]
  const played = (teamA, teamB, winnerId, cupsLeft) => ({ id: `${teamA}${teamB}`, teamA, teamB, winnerId, cupsLeft })

  it('returns all teams with zero stats when nothing played, sorted by name', () => {
    const rows = standings(teams, roundRobin(['A', 'B', 'C', 'D']))
    expect(rows.map(r => r.teamId)).toEqual(['A', 'B', 'C', 'D'])
    expect(rows[0]).toMatchObject({ played: 0, wins: 0, losses: 0, saldo: 0 })
  })
  it('ranks by wins, then cup saldo', () => {
    const rows = standings(teams, [
      played('A', 'B', 'A', 3),
      played('C', 'D', 'C', 7),
      played('A', 'C', 'C', 2),
    ])
    // C: 2 wins. A: 1 win. B & D: 0 wins; B saldo -3, D saldo -7.
    expect(rows.map(r => r.teamId)).toEqual(['C', 'A', 'B', 'D'])
    expect(rows[0].saldo).toBe(9)
  })
  it('two-way tie resolved by direct duel', () => {
    const rows = standings(teams, [
      played('A', 'B', 'B', 2),   // B beat A
      played('C', 'A', 'A', 2),   // A 1-1, saldo 0
      played('B', 'D', 'D', 2),   // B 1-1, saldo 0
    ])
    const a = rows.findIndex(r => r.teamId === 'A')
    const b = rows.findIndex(r => r.teamId === 'B')
    expect(b).toBeLessThan(a) // B won the direct duel
  })
})

describe('finals', () => {
  it('pairs 1v2 and 3v4 from ranking', () => {
    const ranked = [{ teamId: 'C' }, { teamId: 'A' }, { teamId: 'D' }, { teamId: 'B' }]
    const { final, losersFinal } = finalsPairings(ranked)
    expect([final.teamA, final.teamB]).toEqual(['C', 'A'])
    expect([losersFinal.teamA, losersFinal.teamB]).toEqual(['D', 'B'])
    expect(isPlayed(final)).toBe(false)
  })
  it('produces podium order winner, runner-up, losers-final winner, last', () => {
    const fin = { teamA: 'C', teamB: 'A', winnerId: 'A', cupsLeft: 2 }
    const los = { teamA: 'D', teamB: 'B', winnerId: 'D', cupsLeft: 5 }
    expect(finalRanking(fin, los)).toEqual(['A', 'C', 'D', 'B'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/schedule.test.js`
Expected: FAIL — cannot resolve `./schedule.js`.

- [ ] **Step 3: Implement `src/lib/schedule.js`**

```js
// Pure tournament logic — no Vue, no side effects.

export function makeTeams(playerIds, rand = Math.random) {
  if (playerIds.length !== 8) throw new Error('Er zijn exact 8 spelers nodig')
  const shuffled = [...playerIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return [0, 2, 4, 6].map(i => [shuffled[i], shuffled[i + 1]])
}

// Fixed 6-match order for 4 teams: every pairing once, no team twice in a row.
export function roundRobin(teamIds) {
  const [a, b, c, d] = teamIds
  return [[a, b], [c, d], [a, c], [b, d], [a, d], [b, c]].map(([teamA, teamB], i) => ({
    id: `g${i + 1}`,
    teamA,
    teamB,
    winnerId: null,
    cupsLeft: null,
  }))
}

export function isPlayed(match) {
  return match.winnerId !== null
}

export function loserOf(match) {
  return match.winnerId === match.teamA ? match.teamB : match.teamA
}

// Ranking: wins → cup saldo → head-to-head → team name.
export function standings(teams, matches) {
  const stats = new Map(teams.map(t => [t.id, { teamId: t.id, played: 0, wins: 0, losses: 0, saldo: 0 }]))
  for (const m of matches) {
    if (!isPlayed(m)) continue
    const w = stats.get(m.winnerId)
    const l = stats.get(loserOf(m))
    w.played += 1
    l.played += 1
    w.wins += 1
    l.losses += 1
    w.saldo += m.cupsLeft
    l.saldo -= m.cupsLeft
  }
  const nameOf = id => teams.find(t => t.id === id)?.name ?? ''
  const headToHead = (x, y) => {
    const duel = matches.find(m => isPlayed(m) &&
      ((m.teamA === x && m.teamB === y) || (m.teamA === y && m.teamB === x)))
    if (!duel) return 0
    return duel.winnerId === x ? -1 : 1
  }
  return [...stats.values()].sort((x, y) =>
    y.wins - x.wins ||
    y.saldo - x.saldo ||
    headToHead(x.teamId, y.teamId) ||
    nameOf(x.teamId).localeCompare(nameOf(y.teamId), 'nl'))
}

export function finalsPairings(ranked) {
  const ids = ranked.map(r => r.teamId)
  const fresh = (id, teamA, teamB) => ({ id, teamA, teamB, winnerId: null, cupsLeft: null })
  return {
    final: fresh('final', ids[0], ids[1]),
    losersFinal: fresh('losers', ids[2], ids[3]),
  }
}

export function finalRanking(finalMatch, losersMatch) {
  return [finalMatch.winnerId, loserOf(finalMatch), losersMatch.winnerId, loserOf(losersMatch)]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/schedule.test.js`
Expected: PASS (all).

- [ ] **Step 5: Orchestrator commit** — `feat: pure round-robin + standings + finals logic`

---

### Task 3: Name & scenario generators — `src/lib/names.js` (TDD)

**Files:**
- Create: `src/lib/names.js`
- Test: `src/lib/names.test.js`

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/names.test.js`
Expected: FAIL — cannot resolve `./names.js`.

- [ ] **Step 3: Implement `src/lib/names.js`**

```js
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
  for (let attempt = 0; attempt < 50; attempt++) {
    const adj = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(rand() * NOUNS.length)]
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
  return SCENARIOS[Math.floor(rand() * SCENARIOS.length)]
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/names.test.js`
Expected: PASS.

- [ ] **Step 5: Orchestrator commit** — `feat: team name and AI scenario generators`

---

### Task 4: Gemini client + image utils — `src/lib/gemini.js`, `src/lib/images.js` (TDD for gemini)

**Files:**
- Create: `src/lib/gemini.js`
- Create: `src/lib/images.js` (browser-only canvas/FileReader APIs — no unit tests; covered by smoke test)
- Test: `src/lib/gemini.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateTeamPhoto, extractImage, splitDataUrl, GeminiError } from './gemini.js'

afterEach(() => vi.unstubAllGlobals())

describe('splitDataUrl', () => {
  it('splits mime and base64 payload', () => {
    expect(splitDataUrl('data:image/jpeg;base64,AAAA')).toEqual({ mimeType: 'image/jpeg', data: 'AAAA' })
  })
  it('throws on non-data URLs', () => {
    expect(() => splitDataUrl('https://example.com/x.png')).toThrow()
  })
})

describe('extractImage', () => {
  it('finds the last image block in model_output steps', () => {
    const interaction = {
      steps: [
        { type: 'model_output', status: 'done', content: [
          { type: 'text', text: 'here you go' },
          { type: 'image', mime_type: 'image/png', data: 'FIRST' },
          { type: 'image', mime_type: 'image/png', data: 'LAST' },
        ] },
      ],
    }
    expect(extractImage(interaction)).toMatchObject({ data: 'LAST' })
  })
  it('falls back to output_image', () => {
    expect(extractImage({ output_image: { mime_type: 'image/png', data: 'X' } })).toMatchObject({ data: 'X' })
  })
  it('returns null when there is no image', () => {
    expect(extractImage({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'nope' }] }] })).toBeNull()
  })
})

describe('generateTeamPhoto', () => {
  const photos = ['data:image/jpeg;base64,AAA', 'data:image/jpeg;base64,BBB']

  it('POSTs prompt + both photos and returns a data URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: 'OUT' }] }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await generateTeamPhoto({ apiKey: 'k', prompt: 'funny pic', photos })
    expect(result).toBe('data:image/png;base64,OUT')
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/v1beta/interactions')
    expect(opts.headers['x-goog-api-key']).toBe('k')
    const body = JSON.parse(opts.body)
    expect(body.model).toBe('gemini-3.1-flash-image')
    expect(body.input.filter(b => b.type === 'image')).toHaveLength(2)
    expect(body.input.find(b => b.type === 'text').text).toBe('funny pic')
  })

  it('maps 4xx auth errors to a friendly Dutch message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }))
    await expect(generateTeamPhoto({ apiKey: 'bad', prompt: 'x', photos })).rejects.toThrow(/API key/)
  })

  it('maps 429 to a quota message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }))
    await expect(generateTeamPhoto({ apiKey: 'k', prompt: 'x', photos })).rejects.toThrow(/[Qq]uota/)
  })

  it('throws when the response has no image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ steps: [] }) }))
    await expect(generateTeamPhoto({ apiKey: 'k', prompt: 'x', photos })).rejects.toThrow(GeminiError)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/gemini.test.js`
Expected: FAIL — cannot resolve `./gemini.js`.

- [ ] **Step 3: Implement `src/lib/gemini.js`**

```js
// Browser-direct client for the Gemini Interactions API (image generation).

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const MODEL = 'gemini-3.1-flash-image'

export class GeminiError extends Error {}

export function splitDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new GeminiError('Ongeldige afbeelding')
  return { mimeType: match[1], data: match[2] }
}

export function extractImage(interaction) {
  let found = null
  for (const step of interaction.steps ?? []) {
    if (step.type !== 'model_output') continue
    for (const block of step.content ?? []) {
      if (block.type === 'image' && block.data) found = block
    }
  }
  if (!found && interaction.output_image?.data) found = interaction.output_image
  return found
}

function friendlyError(status) {
  if (status === 400 || status === 401 || status === 403) {
    return 'De Gemini API key lijkt ongeldig. Controleer hem op het setup-scherm.'
  }
  if (status === 429) {
    return 'Quota bereikt bij Google — wacht een minuutje en probeer opnieuw.'
  }
  return `De AI-fotogenerator gaf een fout (HTTP ${status}). Probeer opnieuw.`
}

export async function generateTeamPhoto({ apiKey, prompt, photos }) {
  const input = [
    { type: 'text', text: prompt },
    ...photos.map(p => {
      const { mimeType, data } = splitDataUrl(p)
      return { type: 'image', mime_type: mimeType, data }
    }),
  ]
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        response_format: { type: 'image', aspect_ratio: '4:3', image_size: '1K' },
      }),
    })
  } catch {
    throw new GeminiError('Geen verbinding met de AI-fotogenerator. Check je internet.')
  }
  if (!res.ok) throw new GeminiError(friendlyError(res.status))
  const interaction = await res.json()
  const image = extractImage(interaction)
  if (!image) throw new GeminiError('De AI gaf geen afbeelding terug — probeer het nog eens.')
  return `data:${image.mime_type || 'image/png'};base64,${image.data}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/gemini.test.js`
Expected: PASS.

- [ ] **Step 5: Implement `src/lib/images.js`** (no unit tests — FileReader/canvas need a real browser; exercised by the Playwright smoke test)

```js
// Browser image helpers: read files and downscale to keep localStorage small.

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Kon de foto niet lezen'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Kon de foto niet laden'))
    img.src = src
  })
}

// Re-encode as JPEG capped at maxDim on the longest side.
export async function downscale(dataUrl, maxDim, quality = 0.85) {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // JPEG has no alpha; avoid black backgrounds for PNGs
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export const PLAYER_PHOTO_MAX = 512
export const AI_PHOTO_MAX = 768
```

- [ ] **Step 6: Orchestrator commit** — `feat: Gemini image client + browser image utils`

---

### Task 5: Store + toast — `src/store/tournament.js`, `src/store/toast.js` (TDD)

**Files:**
- Create: `src/store/tournament.js`
- Create: `src/store/toast.js`
- Test: `src/store/tournament.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useTournament, STORAGE_KEY, API_KEY_STORAGE } from './tournament.js'

function eightPlayers(t) {
  for (let i = 1; i <= 8; i++) t.addPlayer(`Speler ${i}`)
}

function playAllGroup(t) {
  for (const m of t.state.groupMatches) t.recordResult(m.id, m.teamA, 3)
}

describe('tournament store', () => {
  let t
  beforeEach(() => {
    localStorage.clear()
    t = useTournament()
    t.resetAll()
  })

  it('starts in setup with no players', () => {
    expect(t.state.phase).toBe('setup')
    expect(t.state.players).toHaveLength(0)
  })

  it('caps players at 8 and trims names', () => {
    eightPlayers(t)
    expect(() => t.addPlayer('Negende')).toThrow()
    expect(() => t.addPlayer('   ')).toThrow()
    expect(t.state.players[0].name).toBe('Speler 1')
  })

  it('builds 4 named teams from 8 players and moves to teams phase', () => {
    eightPlayers(t)
    t.buildTeams()
    expect(t.state.phase).toBe('teams')
    expect(t.state.teams).toHaveLength(4)
    const names = new Set(t.state.teams.map(team => team.name))
    expect(names.size).toBe(4)
    const allPlayers = t.state.teams.flatMap(team => team.playerIds)
    expect(new Set(allPlayers).size).toBe(8)
  })

  it('refuses to build teams without 8 players', () => {
    t.addPlayer('Eenzaam')
    expect(() => t.buildTeams()).toThrow()
  })

  it('starts group stage with 6 matches', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    expect(t.state.phase).toBe('group')
    expect(t.state.groupMatches).toHaveLength(6)
  })

  it('records and clears results with validation', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    const m = t.state.groupMatches[0]
    expect(() => t.recordResult(m.id, 'not-a-team', 3)).toThrow()
    expect(() => t.recordResult(m.id, m.teamA, 0)).toThrow()
    expect(() => t.recordResult(m.id, m.teamA, 11)).toThrow()
    t.recordResult(m.id, m.teamA, 4)
    expect(t.state.groupMatches[0].winnerId).toBe(m.teamA)
    t.clearResult(m.id)
    expect(t.state.groupMatches[0].winnerId).toBeNull()
  })

  it('blocks finals until all group matches are played, then pairs 1v2 and 3v4', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    expect(() => t.startFinals()).toThrow()
    playAllGroup(t)
    expect(t.groupDone()).toBe(true)
    t.startFinals()
    expect(t.state.phase).toBe('finals')
    const ranked = t.currentStandings().map(r => r.teamId)
    expect([t.state.finalMatch.teamA, t.state.finalMatch.teamB]).toEqual(ranked.slice(0, 2))
    expect([t.state.losersMatch.teamA, t.state.losersMatch.teamB]).toEqual(ranked.slice(2, 4))
  })

  it('finishes to podium and ranks all four teams', () => {
    eightPlayers(t)
    t.buildTeams()
    t.startGroup()
    playAllGroup(t)
    t.startFinals()
    expect(() => t.finishTournament()).toThrow()
    t.recordResult('final', t.state.finalMatch.teamB, 2)
    t.recordResult('losers', t.state.losersMatch.teamA, 6)
    t.finishTournament()
    expect(t.state.phase).toBe('podium')
    const podium = t.podium()
    expect(podium).toHaveLength(4)
    expect(podium[0]).toBe(t.state.finalMatch.winnerId)
  })

  it('persists to localStorage on the next tick', async () => {
    eightPlayers(t)
    t.buildTeams()
    await nextTick() // the persistence watcher flushes async
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).phase).toBe('teams')
  })

  it('stores the API key separately', () => {
    t.setApiKey('geheim')
    expect(t.getApiKey()).toBe('geheim')
    expect(localStorage.getItem(API_KEY_STORAGE)).toBe('geheim')
    expect(localStorage.getItem(STORAGE_KEY) ?? '').not.toContain('geheim')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/tournament.test.js`
Expected: FAIL — cannot resolve `./tournament.js`.

- [ ] **Step 3: Implement `src/store/tournament.js`**

```js
import { reactive, watch } from 'vue'
import {
  makeTeams, roundRobin, standings, finalsPairings, finalRanking, isPlayed,
} from '../lib/schedule.js'
import { randomTeamName, randomScenario } from '../lib/names.js'

export const STORAGE_KEY = 'beerpong:v1'
export const API_KEY_STORAGE = 'beerpong:apikey'

function freshState() {
  return {
    phase: 'setup', // setup | teams | group | finals | podium
    players: [],    // { id, name, photo }
    teams: [],      // { id, name, playerIds: [a, b], aiPhoto, scenario }
    groupMatches: [], // { id, teamA, teamB, winnerId, cupsLeft }
    finalMatch: null,
    losersMatch: null,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!['setup', 'teams', 'group', 'finals', 'podium'].includes(parsed.phase)) return freshState()
    return { ...freshState(), ...parsed }
  } catch {
    return freshState()
  }
}

const state = reactive(load())

watch(state, value => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Quota exceeded — keep playing in memory; surfaced via UI toast on photo saves.
  }
}, { deep: true })

function findMatch(matchId) {
  return (
    state.groupMatches.find(m => m.id === matchId) ??
    (state.finalMatch?.id === matchId ? state.finalMatch : null) ??
    (state.losersMatch?.id === matchId ? state.losersMatch : null)
  )
}

const actions = {
  addPlayer(name) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Geef een naam op')
    if (state.players.length >= 8) throw new Error('Er zijn al 8 spelers')
    const player = { id: crypto.randomUUID(), name: trimmed, photo: null }
    state.players.push(player)
    return player
  },
  updatePlayer(id, patch) {
    const player = state.players.find(p => p.id === id)
    if (player) Object.assign(player, patch)
  },
  removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id)
  },

  buildTeams(rand = Math.random) {
    const pairs = makeTeams(state.players.map(p => p.id), rand)
    const used = new Set()
    state.teams = pairs.map(playerIds => {
      const name = randomTeamName(rand, used)
      used.add(name)
      return { id: crypto.randomUUID(), name, playerIds, aiPhoto: null, scenario: randomScenario(rand) }
    })
    state.phase = 'teams'
  },
  rerollTeams() {
    if (state.phase !== 'teams') throw new Error('Teams liggen al vast')
    this.buildTeams()
  },
  renameTeam(id, name) {
    const team = state.teams.find(t => t.id === id)
    if (team && name.trim()) team.name = name.trim()
  },
  rerollTeamName(id) {
    const team = state.teams.find(t => t.id === id)
    if (!team) return
    const used = new Set(state.teams.filter(t => t.id !== id).map(t => t.name))
    team.name = randomTeamName(Math.random, used)
  },
  setTeamPhoto(id, dataUrl) {
    const team = state.teams.find(t => t.id === id)
    if (team) team.aiPhoto = dataUrl
  },
  rerollScenario(id) {
    const team = state.teams.find(t => t.id === id)
    if (team) team.scenario = randomScenario()
  },

  startGroup() {
    if (state.teams.length !== 4) throw new Error('Eerst teams maken')
    state.groupMatches = roundRobin(state.teams.map(t => t.id))
    state.phase = 'group'
  },

  recordResult(matchId, winnerId, cupsLeft) {
    const match = findMatch(matchId)
    if (!match) throw new Error('Wedstrijd niet gevonden')
    if (winnerId !== match.teamA && winnerId !== match.teamB) throw new Error('Winnaar speelt niet mee in deze wedstrijd')
    const cups = Number(cupsLeft)
    if (!Number.isInteger(cups) || cups < 1 || cups > 10) throw new Error('Bekers over moet tussen 1 en 10 liggen')
    match.winnerId = winnerId
    match.cupsLeft = cups
  },
  clearResult(matchId) {
    const match = findMatch(matchId)
    if (!match) return
    match.winnerId = null
    match.cupsLeft = null
  },

  groupDone() {
    return state.groupMatches.length === 6 && state.groupMatches.every(isPlayed)
  },
  currentStandings() {
    return standings(state.teams, state.groupMatches)
  },

  startFinals() {
    if (!this.groupDone()) throw new Error('De groepsfase is nog niet klaar')
    const { final, losersFinal } = finalsPairings(this.currentStandings())
    state.finalMatch = final
    state.losersMatch = losersFinal
    state.phase = 'finals'
  },

  finishTournament() {
    if (!isPlayed(state.finalMatch) || !isPlayed(state.losersMatch)) {
      throw new Error('Speel eerst beide finales')
    }
    state.phase = 'podium'
  },
  podium() {
    return finalRanking(state.finalMatch, state.losersMatch)
  },

  teamById(id) {
    return state.teams.find(t => t.id === id)
  },
  playerById(id) {
    return state.players.find(p => p.id === id)
  },

  setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key.trim())
  },
  getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) ?? ''
  },

  resetAll() {
    localStorage.removeItem(STORAGE_KEY)
    Object.assign(state, freshState())
  },
}

export function useTournament() {
  return { state, ...actions }
}
```

**Important for all consumers:** some actions call sibling actions via `this`
(`rerollTeams` → `this.buildTeams()`). Components must keep the store object intact
(`const t = useTournament()` and call `t.rerollTeams()`) — never destructure actions
off it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/tournament.test.js`
Expected: PASS.

- [ ] **Step 5: Implement `src/store/toast.js`** (tiny, no test — exercised everywhere)

```js
import { reactive } from 'vue'

export const toasts = reactive([])

export function toast(message, type = 'error', ttl = 4000) {
  const id = crypto.randomUUID()
  toasts.push({ id, message, type })
  setTimeout(() => {
    const i = toasts.findIndex(t => t.id === id)
    if (i !== -1) toasts.splice(i, 1)
  }, ttl)
}
```

- [ ] **Step 6: Orchestrator commit** — `feat: tournament store with persistence + toast store`

---

### Tasks 6–9: UI screens

**Shared contract for all UI tasks.** Visual treatment follows the frontend-design skill: mobile-first, dark party aesthetic per `src/style.css` tokens (`night`, `night-soft`, `cup`, `beer`, `foam`, `line`; `font-display` for headings/numbers), Dutch playful copy, generous tap targets (min 44px), `max-w-md mx-auto` content column. Implementers own the exact markup/classes; the script logic and behaviors below are the contract and must be implemented exactly. Components communicate ONLY via `useTournament()` actions and props — no new global state.

### Task 6: App shell + SetupScreen

**Files:**
- Modify: `src/App.vue` (replace placeholder)
- Create: `src/components/ToastHost.vue`
- Create: `src/components/ui/PlayerAvatar.vue`
- Create: `src/components/screens/SetupScreen.vue`

- [ ] **Step 1: `src/App.vue`** — phase switcher + header

```vue
<script setup>
import { computed } from 'vue'
import { useTournament } from './store/tournament.js'
import ToastHost from './components/ToastHost.vue'
import SetupScreen from './components/screens/SetupScreen.vue'
import TeamsScreen from './components/screens/TeamsScreen.vue'
import MatchesScreen from './components/screens/MatchesScreen.vue'
import FinalsScreen from './components/screens/FinalsScreen.vue'
import PodiumScreen from './components/screens/PodiumScreen.vue'

const t = useTournament()
const screens = {
  setup: SetupScreen,
  teams: TeamsScreen,
  group: MatchesScreen,
  finals: FinalsScreen,
  podium: PodiumScreen,
}
const current = computed(() => screens[t.state.phase])
const phaseLabels = [
  ['setup', 'Spelers'],
  ['teams', 'Teams'],
  ['group', 'Groepsfase'],
  ['finals', 'Finales'],
  ['podium', 'Podium'],
]
</script>
```

Template: sticky header with `🍺 BEERPONG` wordmark (font-display, beer color) + a 5-dot phase indicator derived from `phaseLabels` (active phase highlighted in `cup`), `<component :is="current" />` in a `max-w-md mx-auto px-4 pb-24` main, `<ToastHost />` at root. Until Tasks 7–9 land, importing all five screens is required — UI tasks 6–9 run in parallel and each creates its own screen file, so `npm run build` is only expected to pass at the Task 9 checkpoint.

- [ ] **Step 2: `src/components/ToastHost.vue`**

```vue
<script setup>
import { toasts } from '../store/toast.js'
</script>

<template>
  <div class="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-lg"
        :class="t.type === 'error' ? 'bg-cup text-foam' : 'bg-beer text-night'"
      >
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
```

- [ ] **Step 3: `src/components/ui/PlayerAvatar.vue`** — props `{ player, size? }`; circular photo (object-cover) or initials fallback on `night-soft` with `beer` initials. Used by all screens.

- [ ] **Step 4: `src/components/screens/SetupScreen.vue`** — behavior contract:
  - Header: "Wie speelt er mee?" + progress "X / 8 spelers".
  - Add-player row: name input + submit (Enter or button) → `t.addPlayer(name)` wrapped in try/catch → `toast(e.message)`.
  - Player list: avatar + name + photo button + remove (✕) button.
  - Photo flow per player: hidden `<input type="file" accept="image/*" capture="user">`; on change → `fileToDataUrl` → `downscale(dataUrl, PLAYER_PHOTO_MAX)` → `t.updatePlayer(id, { photo })`; errors → toast.
  - Collapsible section "🤖 AI-teamfoto's (optioneel)": password-type input bound to API key, save button → `t.setApiKey(...)` + success toast; helper text linking to `https://aistudio.google.com/apikey`; note "Je key blijft op dit toestel."
  - CTA "Maak teams 🎲" — disabled until `players.length === 8`, with helper text showing how many still needed; click → `t.buildTeams()`.

- [ ] **Step 5: Orchestrator checkpoint** — `feat: app shell, toasts, setup screen` (commit happens with Tasks 7–9 if build requires all screens).

### Task 7: TeamsScreen

**Files:**
- Create: `src/components/screens/TeamsScreen.vue`
- Create: `src/components/ui/TeamCard.vue`

- [ ] **Step 1: `TeamsScreen.vue`** behavior contract:
  - Header "De teams! 🎲". Staggered reveal: team cards animate in one-by-one (CSS transition + per-card `setTimeout` delay ~400ms apart) on first mount after `buildTeams`.
  - `TeamCard` per team (see Step 2).
  - Footer buttons: "Herschud teams 🔀" → `t.rerollTeams()` (re-trigger reveal animation); primary CTA "Start de groepsfase →" → `t.startGroup()`.

- [ ] **Step 2: `TeamCard.vue`** — props `{ team }`; uses `useTournament()` for players/actions; local state `generating = ref(false)`:
  - Editable team name (inline input styled as display text) → `t.renameTeam`; 🎲 button → `t.rerollTeamName(team.id)`.
  - Two members: `PlayerAvatar` + names.
  - Photo area (4:3 aspect):
    - If `team.aiPhoto`: show it, with overlay buttons "🔁 Opnieuw" (regenerate with `t.rerollScenario(team.id)` first) and scenario caption.
    - Else if both members have photos AND `t.getApiKey()`: button "✨ Genereer teamfoto" → `generate()`.
    - Else if both have photos: side-by-side member photos (fallback collage) + hint "Vul een API key in voor AI-foto's".
    - Else: hint "Voeg foto's van beide spelers toe voor een teamfoto".
  - `generate()`:
    ```js
    async function generate() {
      generating.value = true
      try {
        const [a, b] = team.playerIds.map(id => t.playerById(id))
        const prompt = buildTeamPhotoPrompt(team.name, team.scenario)
        const raw = await generateTeamPhoto({ apiKey: t.getApiKey(), prompt, photos: [a.photo, b.photo] })
        const small = await downscale(raw, AI_PHOTO_MAX)
        t.setTeamPhoto(team.id, small)
      } catch (e) {
        toast(e.message)
      } finally {
        generating.value = false
      }
    }
    ```
  - While `generating`: pulsing placeholder with rotating funny status lines ("De AI zoekt een flamingo…", "Bekers worden gestapeld…", "Heldenposes worden geoefend…").

- [ ] **Step 3: Orchestrator checkpoint** — `feat: team reveal + AI team photos`.

### Task 8: MatchesScreen (+ ScoreDialog + StandingsTable)

**Files:**
- Create: `src/components/screens/MatchesScreen.vue`
- Create: `src/components/ui/MatchCard.vue`
- Create: `src/components/ui/ScoreDialog.vue`
- Create: `src/components/ui/StandingsTable.vue`

- [ ] **Step 1: `MatchesScreen.vue`** — header "Groepsfase 🍻" + "X / 6 gespeeld"; list of 6 `MatchCard`s; `StandingsTable` below; CTA "Naar de finales 🏆" (only enabled when `t.groupDone()`) → `t.startFinals()`. Selected match held in `ref`; `ScoreDialog` opens for it.

- [ ] **Step 2: `MatchCard.vue`** — props `{ match, index }`; shows "Game N", both team names (and tiny AI photo thumbnails when set); unplayed → "Speel deze game" affordance; played → winner highlighted in `beer` + badge "🏆 +{cupsLeft} bekers"; click → emit `open`.

- [ ] **Step 3: `ScoreDialog.vue`** — props `{ match }`, emits `close`. Modal (fixed overlay, `night-soft` panel):
  - "Wie won?" — two large team buttons (selected gets `cup` background).
  - "Hoeveel bekers had de winnaar nog?" — stepper 1–10 (− / number / +), default 1.
  - Save → `t.recordResult(match.id, winnerId, cups)` in try/catch → toast on error → emit close.
  - If already played: prefill and offer "Wis resultaat" → `t.clearResult(match.id)` → close.
  - Works for group AND finals matches (Task 9 reuses it).

- [ ] **Step 4: `StandingsTable.vue`** — renders `t.currentStandings()`: rank, team name, G (played), W, V (losses), saldo (signed). Top-2 rows accented (they reach the final), bottom-2 muted. Caption: "winsten → bekersaldo → onderling".

- [ ] **Step 5: Orchestrator checkpoint** — `feat: group stage with score entry and live standings`.

### Task 9: FinalsScreen + PodiumScreen

**Files:**
- Create: `src/components/screens/FinalsScreen.vue`
- Create: `src/components/screens/PodiumScreen.vue`

- [ ] **Step 1: `FinalsScreen.vue`** — two sections:
  - "🏆 DE FINALE" — `MatchCard` for `state.finalMatch` (big variant ok), reuses `ScoreDialog`.
  - "🥉 Verliezersfinale" — same for `state.losersMatch`, subtitle "om de eer (en de derde plaats)".
  - CTA "Bekijk het podium 🎉" enabled when both played → `t.finishTournament()`.

- [ ] **Step 2: `PodiumScreen.vue`**:
  - On mount: canvas-confetti — 3 bursts staggered over ~1.5s (`import confetti from 'canvas-confetti'`).
  - Champion block: "🏆 KAMPIOENEN", team name huge in `font-display`, AI photo (or member fallback collage), member names.
  - Podium strip: visual 2-1-3 blocks (heights differ) with team names; 4th place below: "4e — met veel liefde, De {naam}" muted.
  - Full ranking from `t.podium()` mapped through `t.teamById`.
  - Footer: "Nieuw toernooi" button → `confirm('Alles wissen en opnieuw beginnen?')` → `t.resetAll()`.

- [ ] **Step 3: Verify the whole app builds**

Run: `npm test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 4: Orchestrator commit** — `feat: finals + podium with confetti`.

---

### Task 10: Verification

- [ ] **Step 1:** `npm test` → all green.
- [ ] **Step 2:** `npm run build` → success.
- [ ] **Step 3:** Playwright smoke test against `npm run preview`:
  1. Load app → Setup screen visible.
  2. Add 8 players → CTA enables → klik "Maak teams 🎲".
  3. Teams screen: 4 teams, names like "De … …". Herschud works.
  4. Start groepsfase → 6 matches; enter all 6 results via dialog; standings update.
  5. Naar de finales → enter both results → podium shows champion + confetti canvas.
  6. Reload page mid-flow → state restored.
- [ ] **Step 4:** Fix anything found; rerun. Orchestrator commit — `test: smoke-verified full tournament flow`.

### Task 11: Repo + deploy

- [ ] **Step 1:** `gh repo create beerpong-toernooi --public --source . --push`
- [ ] **Step 2:** Enable Pages with GitHub Actions source: `gh api repos/mroedolf/beerpong-toernooi/pages -X POST -f build_type=workflow` (idempotent-ish; if 409 already exists, `-X PUT`).
- [ ] **Step 3:** Wait for the deploy workflow run to succeed (`gh run watch`).
- [ ] **Step 4:** Fetch `https://mroedolf.github.io/beerpong-toernooi/` → expect HTTP 200 and the app HTML.
- [ ] **Step 5:** Optional Playwright check against the live URL.
