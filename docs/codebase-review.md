# Codebasis-Review: vorgeschlagene Aufgaben

## 1) Aufgabe: Tippfehler/Strukturfehler in der README-Schrittliste korrigieren
**Problem:** Die Anleitung startet direkt mit Punkt **2** und **3**. Dadurch fehlt ein erster Schritt und die Einleitung wirkt wie ein Tipp- oder Nummerierungsfehler.

**Fundstelle:** `README.md` (Schritte beginnen bei „2.“).

**Vorschlag:** Schrittfolge konsistent aufbauen (z. B. 1–3) und ggf. einen klaren ersten Schritt ergänzen (z. B. „Platziere Items im Inventar“).

---

## 2) Aufgabe: Programmierfehler beim Tooltip-Update beheben
**Problem:** Beim `mousemove`-Handler wird `showTooltip(null, x, y)` aufgerufen. `showTooltip` setzt jedoch immer `innerHTML = html`; dadurch kann im Tooltip der Text `null` erscheinen.

**Fundstelle:** `script.js` ruft `showTooltip(null, ...)` auf; `src/ui.js` schreibt den übergebenen Wert ungeprüft in `innerHTML`.

**Vorschlag:** `showTooltip` so anpassen, dass `html` nur gesetzt wird, wenn ein String übergeben wurde (oder auf den letzten Inhalt zurückgreifen). Alternativ im `mousemove` nur Position aktualisieren.

---

## 3) Aufgabe: Kommentar-/Doku-Unstimmigkeit zu Grid-Größen korrigieren
**Problem:** Der Kopfkommentar in `script.js` nennt für Storage „8x2“, der tatsächliche Code verwendet aber `10x4` (`STORAGE_SLOTS`). Das ist irreführend für Wartung und Onboarding.

**Fundstelle:** Kopfkommentar und Konstanten in `script.js`.

**Vorschlag:** Kommentar auf den echten Zustand aktualisieren oder (besser) aus Konstanten ableiten/zentral dokumentieren.

---

## 4) Aufgabe: Tests verbessern (Regression für Tooltip & Platzierungslogik)
**Problem:** Es gibt derzeit keine automatisierten Tests für kritische Interaktionspfade (Tooltip-Verhalten, Shape-Platzierung).

**Fundstelle:** Projektstruktur enthält keine Testdateien und keine Test-Skripte in `package.json`.

**Vorschlag:**
- Test-Setup mit Vitest/Jest + jsdom ergänzen.
- Regressionstest für `showTooltip` hinzufügen (kein `"null"`-Rendering bei reinem Mousemove).
- Unit-Tests für `canPlaceShape` (Kantenfälle: Out-of-Bounds, Kollisionen, Masken).
