# AutoBatt — Backpack-style Idle Game (Demo)

Dieses Repository enthält eine kleine Demo eines Idle-Browsergames im Stil von "Backpack Battles".

Features:
- Inventar als Grid (6x3) mit Items unterschiedlicher Formen (1x1, 1x2, 2x2, ...)
- Shop und Storage; Drag & Drop mit Vorschau (Highlight der benötigten Felder)
- Starteritems: Spieler und Gegner bekommen zu Beginn 3 Items
- Battles laufen automatisch 12 Sekunden; Items werden erst nach ihrem Cooldown erstmalig aktiviert
- Items haben Attribute: damage, heal, price, cooldown, dropChance, rarity
- Lebensbalken über Spielern, Live-Update
- Battlelog zeigt Ereignisse übersichtlich

Schnellstart (lokal):

1. Öffne `index.html` in einem Browser (lokal oder per einfachem Static-Server).

2. Ziehe Items aus dem Shop ins Inventar oder in die Storage-Box.

3. Drücke "Starte Battle" — der Kampf läuft 12 Sekunden.

Anpassungen:
- Items definieren / anpassen: `items.js` — die `ITEMS`-Liste ist leicht editierbar.
- Balance: cooldowns sollten zwischen 0.5 und 11.5 Sekunden liegen.

Weiteres:
- Diese Demo ist als statische Webseite implementiert (keine Backend-Abhängigkeiten).
- Wenn du möchtest, kann ich ein kleines Build-Skript, Tests oder persistente Speicherung (localStorage) ergänzen.
# AutoBatt