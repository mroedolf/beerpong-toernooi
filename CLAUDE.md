# Drankspelen

Mobile-first drankspelletjes-site (Vue 3 + Tailwind v4, Vite, GitHub Pages op
https://mroedolf.github.io/drankspelen/). Spellen zijn modules achter een eigen
hash-route; registry in `src/games.js`.

## Copy-conventies (belangrijk)

- **Vlaams, geen Hollands taalgebruik.** Vermijd woorden als "de pineut",
  "knallen", "bagger", "gaat ie". Kies neutrale of Vlaamse formuleringen.
- **Spaarzaam met emoji's.** Alleen functionele iconen (spel-iconen op de
  landingspagina, tellers zoals de koningen/bekers, medailles op het podium, de
  fles zelf). Geen emoji's als decoratie in knoppen, titels of lopende tekst.
- UI-taal is Nederlands; code, comments en commits zijn Engels.

## Code-conventies

- Stores: `const x = useX()` en acties via het object aanroepen — nooit acties
  destructureren (sommige gebruiken `this`).
- Stores gooien Nederlandse `Error`s; componenten vangen ze en tonen `toast(e.message)`.
- Persistentie: versioned localStorage-key per spel + `sanitizeState` die
  structureel onmogelijke states naar een verse lobby degradeert.
- Pure spellogica in `src/lib/` (unit-getest met injecteerbare `rand`); Vue-vrij.
- Design tokens in `src/style.css` (`night`, `night-soft`, `cup`, `cup-dark`,
  `beer`, `foam`, `line`; `font-display`); harde offset-schaduwen, sticker-tilts,
  `pour-in` entrance-animaties, tap targets ≥ 44px.

## Commands

- `npm test` (vitest), `npm run build`, `npm run dev`
- Deploy: push naar `main` → GitHub Actions → Pages. Repo: `mroedolf/drankspelen`
  (persoonlijk account, nooit de Credibill-organisatie).
