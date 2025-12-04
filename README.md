# AutoBatt — Backpack-style Idle Game (Demo)

Dieses Repository enthält eine kleine Demo eines Idle-Browsergames inspiriert von "Backpack Battles".

Features:
- Inventar als Grid (6x3) mit Items unterschiedlicher Formen (1x1, 1x2, 2x2, ...)
- Shop und Storage; Drag & Drop mit Vorschau (Highlight der benötigten Felder)
- Starteritems: Spieler und Gegner bekommen zu Beginn 3 Items
- Battles laufen automatisch 12 Sekunden; Items werden erst nach ihrem Cooldown erstmalig aktiviert
- Items haben Attribute: `damage`, `heal`, `price`, `cooldown`, `dropChance`, `rarity`
- Lebensbalken über Spielern, Live-Update
- Battlelog zeigt Ereignisse übersichtlich

Schnellstart (lokal):

1. Öffne `index.html` in einem Browser (lokal) oder starte einen einfachen Static-Server:

```bash
python3 -m http.server 8000
# dann im Browser: http://localhost:8000/index.html
```

2. Ziehe Items aus dem Shop ins Inventar oder in die Storage-Box.

3. Drücke "Starte Battle" — der Kampf läuft 12 Sekunden.

Kaufen aus dem Shop:
- Klicke ein Shop-Item, um es zu kaufen (du startest mit 200 Gold). Das Item wird zuerst ins Inventar, bei Platzmangel in die Storage-Box gelegt.
- Wenn nicht genug Gold oder kein Platz vorhanden ist, erscheint eine Meldung im Battlelog.

Reset / Persistenz:
- Die Demo speichert automatisch im `localStorage`. Drücke den `Reset`-Button um den Speicher zu löschen und neu zu laden.

Wichtige Hinweise:
- Items definieren / anpassen: `items.js` — die `ITEMS`-Liste wurde programmgesteuert auf 50 Items erweitert.
- Die Demo speichert Inventar/Shop/Storage automatisch im `localStorage` deines Browsers.
