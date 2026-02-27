# AutoBatt

Schlichter Browser-Autobattler im Stil von Backpack-Battles.

## Features
- Drag & Drop Inventar mit Item-Größen (6x3 + 6x6 Rucksack + 10x4 Global Storage)
- Shop mit Gold-System
- Auto-Battle mit Cooldowns, Schaden/Heal, Reward + Drop
- Rechtsklick auf Spieler-Items verkauft zum halben Preis
- Persistenz via `localStorage`

## Start
Öffne einfach `index.html` im Browser oder starte lokal:

```bash
python3 -m http.server 4173
```

Dann: `http://localhost:4173` öffnen.

## Steuerung
1. Item im Shop klicken (kaufen) oder per Drag ins Inventar ziehen.
2. Items im Inventar/Rucksack sortieren.
3. `Battle starten` klicken.
4. Nach Runde: Gold/Drop einsammeln, Setup verbessern.

## Entwicklung
```bash
npm run lint
```
