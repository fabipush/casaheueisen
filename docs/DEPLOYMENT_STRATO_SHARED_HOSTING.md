# Deployment auf Strato Shared Hosting (ohne Node.js)

Strato bietet auf klassischen Shared-Hosting-Paketen kein Node.js. Damit die Anwendung trotzdem mit deiner bestehenden MySQL-Datenbank funktioniert, enthält das Projekt jetzt eine PHP-basierte REST-API. Diese Anleitung führt dich Schritt für Schritt durch den Upload und die Konfiguration.

## Voraussetzungen

- Strato-Paket mit PHP 8.x und MySQL-Datenbank
- FTP-/SFTP-Zugangsdaten für den Webspace
- Die in der Frage genannten Datenbankdaten:
  - **DB:** `dbs14937341`
  - **DB-User:** `dbu2588999`
  - **DB-Passwort:** `casaheueisen2025`
- Optional: phpMyAdmin-Zugang im Strato-Kundenbereich, falls du Daten prüfen möchtest

## 1. Projekt vorbereiten

1. Klone das Repository lokal oder lade das bestehende Paket herunter.
2. Stelle sicher, dass der neue Ordner `api/` mit folgenden Dateien vorhanden ist:
   - `api/index.php` – die REST-API
   - `api/config.sample.php` – Vorlage für die Zugangsdaten
   - `api/.htaccess` – sorgt dafür, dass Requests wie `/api/todos` an `index.php` weitergeleitet werden

## 2. Konfiguration für Strato anlegen

1. Kopiere `api/config.sample.php` nach `api/config.php`.
2. Öffne `api/config.php` und trage deine Datenbankdaten ein:

   ```php
   <?php
   return [
       'db_host' => 'rdbms.strato.de',
       'db_name' => 'dbs14937341',
       'db_user' => 'dbu2588999',
       'db_pass' => 'casaheueisen2025',
       'db_port' => 3306,
       'table_prefix' => 'casa_', // kann leer bleiben, hilft aber bei mehreren Projekten
   ];
   ```

3. Speichere die Datei. Sie wird **nicht** ins Git übernommen, bleibt aber auf dem Webspace.

## 3. Dateien hochladen

1. Verbinde dich per FTP/SFTP mit deinem Strato-Webspace.
2. Lade alle Projektdateien hoch:
   - `index.html`, `app.js`, `styles.css`, `assets/`, `app.config.example.js`
   - Den kompletten Ordner `api/` mit deiner angepassten `config.php`
3. Optional: Entferne Dateien wie `server.js`, `package.json` etc., wenn du sie nicht brauchst. Sie stören nicht, werden aber auch nicht benötigt.

> Tipp: Lege alles in ein Unterverzeichnis, z. B. `/casaheueisen/`, und setze im Strato-Kundenmenü das Web-Verzeichnis deiner Domain auf diesen Ordner. So bleibt alles aufgeräumt.

## 4. Datenbank prüfen

Die PHP-API legt beim ersten Aufruf automatisch die Tabelle an (`casa_todos`). Falls du den Inhalt kontrollieren willst:

1. Melde dich im Strato-Kundenbereich bei phpMyAdmin an.
2. Wähle die Datenbank `dbs14937341`.
3. Prüfe, ob die Tabelle `casa_todos` existiert. Sie enthält die Spalten `id`, `title`, `scope`, `room`, `notes`, `completed`, `created_at`.
4. Beim ersten Start werden drei Beispielaufgaben eingefügt. Du kannst sie später löschen.

## 5. Frontend konfigurieren (optional)

Die App versucht automatisch, `/api` auf derselben Domain anzusprechen. Wenn Frontend und API auf demselben Strato-Webspace liegen, musst du nichts weiter tun. 

*Wenn du die API von einer anderen Domain aus aufrufst:* Kopiere `app.config.example.js` nach `app.config.js`, passe den `apiBaseUrl` an und binde die Datei vor `app.js` ein.

```html
<script src="app.config.js"></script>
<script src="app.js" defer></script>
```

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://meine-andere-domain.de/api"
};
```

## 6. Installation testen

1. Öffne im Browser `https://deine-domain.de/` (bzw. den Unterordner, falls du einen nutzt).
2. Melde dich mit dem Admin-Passwort `bauen2024` an.
3. Lege eine neue Aufgabe an oder ändere den Status einer bestehenden Aufgabe.
4. Aktualisiere die Seite – die Änderung sollte erhalten bleiben.

Direkter API-Test (optional):

- `https://deine-domain.de/api/todos` im Browser öffnen. Es sollte JSON mit allen Aufgaben erscheinen.

## 7. Fehlersuche

- **Fehlermeldung „Konfiguration nicht gefunden“**: Prüfe, ob `api/config.php` existiert und die Dateiberechtigungen 644 oder 640 betragen.
- **„Keine Verbindung zur Datenbank möglich“**: Kontrolliere Host, Benutzer, Passwort. Stelle sicher, dass der DB-User Zugriff auf die Datenbank hat (Strato-Kundenmenü → Datenbank-Verwaltung).
- **404 auf `/api/todos`**: Achte darauf, dass die `.htaccess` im `api/`-Ordner liegt. Manchmal muss in Strato-Admin „RewriteEngine erlauben“ aktiviert werden.
- **500-Fehler**: Aktiviere in `api/index.php` temporär `ini_set('display_errors', 1);` (oberhalb der Header), lade die Seite neu und lies die genaue PHP-Fehlermeldung. Danach wieder entfernen.

## 8. Sicherheitstipps

- Ändere nach dem ersten Test das Datenbankpasswort im Strato-Backend und passe `config.php` entsprechend an.
- Setze für die Admin-/Viewer-Passwörter langfristig stärkere Kennwörter.
- Halte die PHP-Version aktuell (Strato Kunden-Login → Hosting → PHP-Version).

Mit diesen Schritten läuft die Anwendung komplett auf Strato Shared Hosting – ohne Node.js, aber mit voller DB-Anbindung.
