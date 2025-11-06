# Betrieb auf gemeinsamem Webspace

Die App benötigt einen Node.js-Prozess, um als Proxy zwischen Browser und MySQL-Datenbank zu fungieren. Reines Hochladen der statischen Dateien reicht nicht aus.

> **Strato ohne Node.js?** Verwende stattdessen die PHP-Variante aus [`DEPLOYMENT_STRATO_SHARED_HOSTING.md`](DEPLOYMENT_STRATO_SHARED_HOSTING.md).

1. **Node.js bereitstellen**
   * Prüfe, ob dein Hosting die Einrichtung von Node.js-Anwendungen zulässt (z. B. Plesk „Node.js-App“, cPanel Passenger oder SSH-Zugang).
   * Lege das Projektverzeichnis als Dokumentenstamm fest oder richte einen eigenen Ordner für die App ein.

2. **Projektdateien hochladen**
   * Übertrage den gesamten Inhalt des Repositories.
   * Wenn die statische Auslieferung über den Node-Server erfolgen soll, muss das Document Root auf das Projekt zeigen.

3. **Abhängigkeiten installieren**
   ```bash
   npm install --production mysql2
   ```
   `mysql2` ist optional, solange MySQL genutzt wird. Ohne diese Bibliothek schaltet der Server in den JSON-Dateimodus.

4. **Konfiguration setzen**
   * Entweder `.env` neben `server.js` anlegen oder Umgebungsvariablen im Hosting-Panel pflegen.
   * Mindestens benötigt: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`.
   * Setze `DB_SSL=true`, falls dein Hoster SSL für MySQL verlangt. Optional `DB_SSL_CA` für das Zertifikat.

5. **Server starten**
   ```bash
   node server.js
   ```
   * Viele Hoster erwarten `npm start` oder bieten Buttons wie „App starten“. Wichtig ist, dass `server.js` ausgeführt wird.
   * Für dauerhaften Betrieb `pm2`, Passenger oder systemeigene Supervisoren verwenden.

6. **Frontend mit API verbinden**
   * Wenn der Node-Prozess auch die statischen Dateien ausliefert, funktioniert `/api/...` ohne weitere Anpassung.
   * Läuft das Frontend separat (z. B. über Apache), erstelle `app.config.js` und binde dort `window.APP_CONFIG.apiBaseUrl` auf den Pfad des Node-Servers ein.

7. **Smoke-Test**
   * `curl https://deine-domain/api/health` sollte `{"status":"ok"}` liefern.
   * Anmeldung im Frontend durchführen; Aufgaben müssen erscheinen und speicherbar sein.

> Auf Shared-Hosting ohne Node-Unterstützung muss die API auf einem externen System betrieben werden (z. B. VPS, Docker-Host oder PaaS wie Render, Railway, Fly.io). Das Frontend kann dann weiterhin vom Webspace bedient werden, solange `apiBaseUrl` auf die externe Adresse zeigt.
