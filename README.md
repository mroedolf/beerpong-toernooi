# Beerpong Toernooi 🍺

Toernooi-app voor 8 spelers: willekeurige teams van 2, groepsfase (round robin),
finale + verliezersfinale, en AI-gegenereerde belachelijke teamfoto's.

**Live:** https://mroedolf.github.io/beerpong-toernooi/

## Lokaal draaien

```bash
npm install
npm run dev
```

## AI-teamfoto's

Optioneel: vul een [Gemini API key](https://aistudio.google.com/apikey) in op het
setup-scherm. De key blijft in localStorage van je browser en verlaat je toestel
alleen richting de Google API.

## Formaat

- 8 spelers → 4 willekeurige teams van 2
- Groepsfase: volledige round robin (6 wedstrijden, 3 per team)
- Finale (#1 vs #2) en verliezersfinale (#3 vs #4) → elk team speelt exact 4 games
- Stand: winsten → bekersaldo → onderling resultaat
