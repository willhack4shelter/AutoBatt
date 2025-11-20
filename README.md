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

Wichtige Hinweise:
- Items definieren / anpassen: `items.js` — die `ITEMS`-Liste wurde programmgesteuert auf 50 Items erweitert.
- Die Demo speichert Inventar/Shop/Storage automatisch im `localStorage` deines Browsers.

GitHub Pages
1. Erstelle ein Repository auf GitHub und pushe dieses Projekt.
2. Aktiviere in den Repository-Einstellungen unter "Pages" die Branch `main` als Quelle und wähle `/ (root)`.
3. Nach kurzer Wartezeit ist die Demo unter `https://<user>.github.io/<repo>/index.html` erreichbar.

Weiteres:
- Wenn du möchtest, kann ich Persistenz verfeinern, Kauf-/Währungssystem hinzufügen, Item-Drops implementieren oder GitHub Actions für automatisches Deployment erstellen.
