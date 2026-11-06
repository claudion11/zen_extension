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

## Zwei Modi

| | **API-Schlüssel** | **Claude Pro/Max-Konto** |
|---|---|---|
| Antwort erscheint | direkt in der Seitenleiste | in einem neuen claude.ai-Tab |
| Kosten | nach Verbrauch (console.anthropic.com) | im Abo enthalten |
| Voraussetzung | API-Schlüssel | in claude.ai angemeldet |

Umschalten unter ⚙ Einstellungen → Modus. Im Pro-Modus wird deine Nachricht (ggf. mit Seiteninhalt)
als Link `claude.ai/new?q=…` geöffnet. Ist sie dafür zu lang (z. B. bei langen Seiten), wird sie in die
Zwischenablage kopiert und du fügst sie in claude.ai mit Strg+V ein.

## Installation (Entwicklermodus)

1. Zen öffnen und `about:debugging#/runtime/this-firefox` aufrufen.
2. **„Temporäres Add-on laden…“** klicken und die Datei `manifest.json` aus diesem Ordner auswählen.
3. Die Seitenleiste öffnet sich – über ⚙ den Modus wählen:
   entweder **Pro-Konto** (kein Schlüssel nötig) oder deinen **Anthropic API-Schlüssel** eintragen
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
- API-Modus: Anfragen gehen direkt vom Browser an `api.anthropic.com` – kein Zwischenserver.
- Pro-Modus: Die Erweiterung öffnet nur claude.ai mit deinem Text; sie liest weder deine Anmeldung noch Antworten aus.
- Seiteninhalte werden nur gesendet, wenn du „Aktuelle Seite als Kontext“ aktivierst oder „Zusammenfassen“ nutzt.

## Struktur

```
manifest.json        Erweiterungs-Manifest (Manifest V2, Firefox/Zen)
background.js        Kontextmenüs, Toolbar-Button
sidebar/             Chat-Oberfläche (HTML/CSS/JS + Mini-Markdown-Renderer)
options/             Einstellungen (API-Schlüssel, Modell, System-Prompt)
icons/icon.svg       Symbol
```
