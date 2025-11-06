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

## Betrieb auf gemeinsamem Webspace

- Für Setups **mit Node.js-Unterstützung** findest du weiterhin die Schritt-für-Schritt-Anleitung in [`docs/DEPLOYMENT_SHARED_HOSTING.md`](docs/DEPLOYMENT_SHARED_HOSTING.md).
- Für Strato-Hosting **ohne Node.js** gibt es jetzt eine komplette PHP-Variante. Folge [`docs/DEPLOYMENT_STRATO_SHARED_HOSTING.md`](docs/DEPLOYMENT_STRATO_SHARED_HOSTING.md), um die API mit PHP zum Laufen zu bringen und die bestehende MySQL-Datenbank zu nutzen.

Kurzfassung Node.js:

1. Frontend-Dateien allein genügen nicht – der Node.js-Server muss laufen, weil er als Schnittstelle zur MySQL-Datenbank dient.
2. Über das Hosting-Panel oder via SSH Node.js aktivieren und im Projektordner `npm install --production mysql2` ausführen.
3. `.env` bzw. Umgebungsvariablen mit `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, optional `DB_SSL`, und dem gewünschten `PORT` setzen.
4. `node server.js` (oder `npm start`) starten. Die API steht dann unter `/api/...` bereit und liefert auch die statischen Dateien aus.
5. Bei getrenntem Frontend `app.config.example.js` kopieren → `app.config.js` und dort `window.APP_CONFIG = { apiBaseUrl: "https://dein-backend.example.com/api" };` setzen (_vor_ `app.js` einbinden).
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
