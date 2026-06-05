# Drankspelen 🍻

Drankspelletjes-site voor feestjes — kies je spel op de landingspagina.

**Live:** https://mroedolf.github.io/drankspelen/

## Spellen

### 🏆 Beerpong Toernooi
- 4–16 spelers (even) → willekeurige teams van 2, met AI-gegenereerde belachelijke teamfoto's
- Groepsfase: volledige round robin; finale (#1 vs #2) en optionele verliezersfinale (#3 vs #4)
- Instelbaar: bekers per game (6 of 10), verliezersfinale aan/uit
- Bij 8 spelers speelt elk team exact 4 games
- Stand: winsten → bekersaldo → onderling resultaat

### 🎲 Mex (Mexico)
- 2+ spelers, twee dobbelstenen; Mex (2-1) is de hoogste worp, dubbels zijn honderdtallen
- Voorgooier bepaalt het aantal worpen (max 3); één steen vasthouden mag
- Elke Mex legt een instelbaar bedrag (¼–1 adje) in de pot; de verliezer drinkt
  de basis-slokken plus de pot
- Dubbels: dat cijfer uitdelen als slokken · 31: deel 1 slok uit, worp terug
- Schandebord houdt slokken en adjes bij

### 🃏 Circle of Death
- 2+ spelers, om de beurt een kaart trekken; elke kaart heeft een drinkregel
- Klassieke regels (A = waterval … K = koningsbeker), in de app na te lezen
- De vierde koning drinkt de koningsbeker leeg — einde spel

## Lokaal draaien

```bash
npm install
npm run dev
```

## AI-teamfoto's (Beerpong)

Optioneel: vul een [Gemini API key](https://aistudio.google.com/apikey) in op het
setup-scherm. De key blijft in localStorage van je browser en verlaat je toestel
alleen richting de Google API.
