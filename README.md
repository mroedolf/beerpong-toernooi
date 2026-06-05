# Drankspelen 🍻

Drankspelletjes-site voor feestjes — kies je spel op de landingspagina.

**Live:** https://mroedolf.github.io/drankspelen/

## Spellen

### 🏆 Beerpong Toernooi
- 8 spelers → 4 willekeurige teams van 2, met AI-gegenereerde belachelijke teamfoto's
- Groepsfase: volledige round robin (6 wedstrijden, 3 per team)
- Finale (#1 vs #2) en verliezersfinale (#3 vs #4) → elk team speelt exact 4 games
- Stand: winsten → bekersaldo → onderling resultaat

### 🎲 Mex (Mexico)
- 2+ spelers, twee dobbelstenen; Mex (2-1) is de hoogste worp, dubbels zijn honderdtallen
- Voorgooier bepaalt het aantal worpen (max 3); één steen vasthouden mag
- Elke Mex legt een instelbaar bedrag (¼–1 adje) in de pot; de verliezer drinkt
  de basis-slokken plus de pot
- Dubbels: dat cijfer uitdelen als slokken · 31: deel 1 slok uit, worp terug
- Schandebord houdt slokken en adjes bij

## Lokaal draaien

```bash
npm install
npm run dev
```

## AI-teamfoto's (Beerpong)

Optioneel: vul een [Gemini API key](https://aistudio.google.com/apikey) in op het
setup-scherm. De key blijft in localStorage van je browser en verlaat je toestel
alleen richting de Google API.
