# Zen Claude

Eine Browser-Erweiterung für den [Zen Browser](https://zen-browser.app) (und Firefox), die Claude direkt in die Seitenleiste bringt.

## Funktionen

- 💬 **Chat in der Seitenleiste** mit Streaming-Antworten und Markdown-Darstellung
- 📄 **Seite zusammenfassen** – per Button oder Rechtsklick
- 🌐 **Aktuelle Seite als Kontext** – Häkchen setzen und Fragen zur offenen Seite stellen
- 🖱️ **Kontextmenü für markierten Text**: Claude fragen, erklären, übersetzen
- ⌨️ **Tastenkürzel** `Ctrl+Shift+Y` zum Öffnen/Schließen
- 💾 Chatverlauf bleibt erhalten, bis du „＋ Neuer Chat“ klickst
- ⚙️ Modell, maximale Antwortlänge und System-Prompt einstellbar
- 🌙 Helles und dunkles Design (folgt dem System)

## Installation (Entwicklermodus)

1. Zen öffnen und `about:debugging#/runtime/this-firefox` aufrufen.
2. **„Temporäres Add-on laden…“** klicken und die Datei `manifest.json` aus diesem Ordner auswählen.
3. Die Seitenleiste öffnet sich – über ⚙ deinen **Anthropic API-Schlüssel** eintragen
   (erstellen unter <https://console.anthropic.com/settings/keys>) und speichern.

> Temporäre Add-ons werden beim Neustart entfernt. Für eine dauerhafte Installation
> die Erweiterung als ZIP packen und über <https://addons.mozilla.org/developers/> signieren lassen
> (auch „nicht gelistet“ möglich), oder in einer Zen-/Firefox-Version mit
> `xpinstall.signatures.required = false` installieren.

### Als .xpi packen

```bash
zip -r -FS zen-claude.xpi manifest.json background.js sidebar options icons
```

## Datenschutz

- Der API-Schlüssel wird ausschließlich lokal in `browser.storage.local` gespeichert.
- Anfragen gehen direkt vom Browser an `api.anthropic.com` – kein Zwischenserver.
- Seiteninhalte werden nur gesendet, wenn du „Aktuelle Seite als Kontext“ aktivierst oder „Zusammenfassen“ nutzt.

## Struktur

```
manifest.json        Erweiterungs-Manifest (Manifest V2, Firefox/Zen)
background.js        Kontextmenüs, Toolbar-Button
sidebar/             Chat-Oberfläche (HTML/CSS/JS + Mini-Markdown-Renderer)
options/             Einstellungen (API-Schlüssel, Modell, System-Prompt)
icons/icon.svg       Symbol
```
