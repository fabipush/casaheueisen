# Casa Heueisen – Virtuelle Baudokumentation

## Projekt starten

1. **Repository klonen**
2. **Server starten**
   ```bash
   node server.js
   ```
3. Öffne `http://localhost:3000` im Browser.

> Für den Dateibetrieb ist keine weitere Installation notwendig. Der Server erzeugt automatisch eine lokale `data/todos.json` und speichert dort alle Aufgaben.

## Optional: MySQL-Datenbank verwenden

1. `npm install mysql2`
2. `.env` aus `.env.example` übernehmen und mit deinen Verbindungsdaten füllen.
3. `DB_HOST` gesetzt → der Server nutzt die MySQL-Datenbank, legt die Tabelle `todos` an und verwendet sie fortan.

### Schritt-für-Schritt: Verbindung zur Datenbank `baduyrxbnk`

Der neue Webserver stellt PHP **und** Node.js bereit. So aktivierst du die MySQL-Datenbank `baduyrxbnk` für die App:

1. **Projekt hochladen** – Kopiere das gesamte Repository (inkl. `server.js`, `api/`, `index.html`, `styles.css`, `app.js`).
2. **In das Projektverzeichnis wechseln** – per SSH `cd /pfad/zum/projekt`.
3. **Abhängigkeit installieren** – `npm install --production mysql2` ausführen.
4. **`.env` anlegen** – `cp .env.example .env` und die bereits eingetragenen Werte überprüfen:
   ```ini
   DB_HOST=localhost
   DB_USER=baduyrxbnk
   DB_PASSWORD=3SME7kReSa
   DB_NAME=baduyrxbnk
   ```
   Passe `DB_HOST` an, falls dein Hoster einen anderen Datenbank-Host nennt (z. B. `rdbms.strato.de`).
5. **Node-Server starten** – `node server.js` (oder über das Hosting-Panel). Der Prozess liefert sowohl `/api/...` als auch die statischen Dateien.
6. **Frontend anbinden** – liegt das Frontend auf demselben Host, ist keine weitere Konfiguration nötig. Andernfalls `app.config.example.js` nach `app.config.js` kopieren und dort `apiBaseUrl` setzen.
   > Hinweis: Das Dashboard prüft automatisch sowohl `/api` als auch `/api/index.php`. Wenn dein Hosting keine Rewrite-Regeln zulässt, kannst du `apiBaseUrl` direkt auf `https://deine-domain.example/api/index.php` setzen.
7. **Verbindung testen** – `curl https://<deine-domain>/api/health` muss `{"status":"ok"}` zurückgeben und das Dashboard sollte Aufgaben laden und speichern können.

> Möchtest du stattdessen die PHP-API verwenden, lege `api/config.php` aus der Vorlage `api/config.sample.php` an und trage dieselben Zugangsdaten (`baduyrxbnk` / `3SME7kReSa`) ein.

## Betrieb auf gemeinsamem Webspace

- Für Setups **mit Node.js-Unterstützung** findest du weiterhin die Schritt-für-Schritt-Anleitung in [`docs/DEPLOYMENT_SHARED_HOSTING.md`](docs/DEPLOYMENT_SHARED_HOSTING.md).
- Für Strato-Hosting **ohne Node.js** gibt es jetzt eine komplette PHP-Variante. Folge [`docs/DEPLOYMENT_STRATO_SHARED_HOSTING.md`](docs/DEPLOYMENT_STRATO_SHARED_HOSTING.md), um die API mit PHP zum Laufen zu bringen und die bestehende MySQL-Datenbank zu nutzen.

Kurzfassung Node.js:

1. Frontend-Dateien allein genügen nicht – der Node.js-Server muss laufen, weil er als Schnittstelle zur MySQL-Datenbank dient.
2. Über das Hosting-Panel oder via SSH Node.js aktivieren und im Projektordner `npm install --production mysql2` ausführen.
3. `.env` bzw. Umgebungsvariablen mit `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, optional `DB_SSL`, und dem gewünschten `PORT` setzen.
4. `node server.js` (oder `npm start`) starten. Die API steht dann unter `/api/...` bereit und liefert auch die statischen Dateien aus.
5. Bei getrenntem Frontend `app.config.example.js` kopieren → `app.config.js` und dort `window.APP_CONFIG = { apiBaseUrl: "https://dein-backend.example.com/api" };` setzen (_vor_ `app.js` einbinden).
   > Auch hier gilt: Falls dein Webserver keine Umschreibungen unterstützt, gib `https://dein-backend.example.com/api/index.php` an – die App versucht beide Varianten automatisch.
6. Mit `https://<deine-domain>/api/health` prüfen, ob die API erreichbar ist.

## Login-Daten

- **Admin:** `bauen2024`
- **Viewer:** `anschauen`

## Verfügbare Skripte

```bash
npm start # startet den Server über node server.js
```

## API-Endpunkte

- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `GET /api/health`

Alle Endpunkte liefern bzw. erwarten JSON.
