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
