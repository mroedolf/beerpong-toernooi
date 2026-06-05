# Circle of Death — Design

**Date:** 2026-06-05
**Status:** Approved (autonomous mode)

## Purpose

Add Circle of Death (King's Cup) as the third game: draw cards from a shuffled
deck, every rank has a drinking rule, the fourth king drinks the king's cup and
ends the game.

## Rules (classic, Dutch UI; display-only — social effects happen at the table)

| Kaart | Regel | Tekst |
|---|---|---|
| A | Waterval | Iedereen drinkt; je mag pas stoppen als je buur stopt — de trekker begint. |
| 2 | Jij | Wijs iemand aan — die drinkt. |
| 3 | Ik | Zelf drinken. Proost. |
| 4 | Vloer | Laatste die de vloer aanraakt drinkt. |
| 5 | Mannen | Alle mannen drinken. |
| 6 | Vrouwen | Alle vrouwen drinken. |
| 7 | Hemel | Laatste die een hand omhoog steekt drinkt. |
| 8 | Maatje | Kies een maatje — die drinkt vanaf nu telkens met je mee. |
| 9 | Rijm | Zeg een woord; om de beurt rijmen. Wie stokt, drinkt. |
| 10 | Categorieën | Kies een categorie; om de beurt iets noemen. Wie stokt, drinkt. |
| B | Regel | Verzin een regel. Overtreders drinken, de rest van het spel. |
| V | Vragenrondje | Stel iemand een vraag; die vraagt meteen iemand anders. Wie antwoordt of stokt, drinkt. |
| K | Koningsbeker | Giet wat van je drankje in de koningsbeker. **De vierde koning drinkt hem leeg!** |

No tracking of maatjes/verzonnen regels (no mid-game admin); the app shows
whose turn it is, the drawn card + rule, cards remaining and kings drawn.
The game ends when the fourth king is drawn (the deck can never empty first).

## Decisions

- Turn-based with named players, min 2 (pattern of Mex); "Neem spelers over"
  merges tournament + Mex names (union, deduped, lobby-only).
- Persistence: `cod:v1`, same versioned-key/watch/try-catch pattern.
- Card reveal is the signature moment: realistic card face (rank + suit pips,
  red ♥♦ / dark ♠♣ on foam), 3D flip on draw, deck ring depletes, kings cup in
  the center fills 👑 ×4; the fourth king triggers a climax "finished" screen.
- Restart: finished screen → "Opnieuw 🔄" (same players, fresh shuffle) and
  "Naar de lobby". Stop anytime from the table → lobby (players kept).

## Architecture

```
src/lib/cod.js                       # pure: RULES (13), buildDeck (Fisher-Yates,
                                     #   injectable rand), suit/rank constants
src/store/cod.js                     # phase lobby|playing|finished; players;
                                     #   deck; current {card, drawerId}; kingsDrawn;
                                     #   turnIndex; actions (tested)
src/components/screens/CodScreen.vue # subview switch (pattern of MexScreen)
src/components/cod/CodLobby.vue      # players, import, rules panel, start
src/components/cod/CodTable.vue      # turn header, deck ring + kings cup, draw
                                     #   button, card flip reveal, stop
src/components/cod/CodFinished.vue   # 4th-king climax + restart
src/games.js                         # + { id:'cod', path:'/circle', '🃏',
                                     #   'Circle of Death', tagline, '2+ spelers' }
src/App.vue                          # + route '/circle'
HomeScreen.vue                       # + live status ("12/52 kaarten · 2/4 koningen")
```

### Store contract

State: `{ phase, players: [{id,name}], deck: [{rank,suit}...remaining],
current: {card, drawerId} | null, kingsDrawn, turnIndex }`.
Actions: `addPlayer`, `removePlayer`, `importPlayers(names)`, `startGame`
(≥2 players → fresh shuffled deck, turn 0), `drawCard(rand?)` (pop deck head,
set current, count kings, advance turn, 4th king → `finished`), `stopGame`
(→ lobby, players kept), `restart` (same players, new deck, straight to
playing). Errors in Dutch, callers toast. Store object stays intact (`this`).

## Testing

lib: 52 unique cards, all rank×suit combos, seeded-shuffle determinism, a rule
for all 13 ranks. Store: lobby validations + import dedup; draw rotates turns
and shrinks the deck; kings counted; exactly the 4th king finishes; restart
reshuffles and resets; guard against drawing while finished/lobby; persistence
on next tick.

## Out of scope (YAGNI)

Maatje/regel tracking, custom rule sets per card, sips tally (no defined loser
per draw), card images/artwork, sounds.
