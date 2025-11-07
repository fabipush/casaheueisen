# Casa Heueisen – Laravel Edition

Dieses Repository enthält die Laravel-Version der virtuellen Baudokumentation für das Einfamilienhaus *Casa Heueisen*. Das Frontend bleibt eine Single-Page-App, wird aber jetzt vollständig von einer Laravel-API versorgt, die To-Dos in einer MySQL-Datenbank speichert.

## Voraussetzungen

* PHP 8.1 oder neuer
* Composer 2
* MySQL 8 (oder kompatibel)
* Node.js wird nicht mehr benötigt

## Installation

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Passen Sie anschließend die `.env`-Datei an Ihre Umgebung an. Die hinterlegten Default-Werte zeigen auf die aktuelle Datenbank:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=baduyrxbnk
DB_USERNAME=baduyrxbnk
DB_PASSWORD=3SME7kReSa
```

Führen Sie danach die Migrationen und Seed-Daten aus:

```bash
php artisan migrate --seed
```

## Datenbank verbinden (Schritt für Schritt)

1. Öffnen Sie die Datei `.env` im Projektstamm.
2. Tragen Sie Host, Port, Datenbankname, Benutzer und Passwort Ihrer MySQL-Instanz ein. Für den aktuellen Stand:
   ```
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=baduyrxbnk
   DB_USERNAME=baduyrxbnk
   DB_PASSWORD=3SME7kReSa
   ```
3. Speichern Sie die Datei und stellen Sie sicher, dass der MySQL-Server Verbindungen vom Webserver akzeptiert.
4. Führen Sie die Migrationen aus, damit Laravel die Tabelle `todos` anlegt:
   ```bash
   php artisan migrate --force
   ```
5. (Optional) Befüllen Sie die Datenbank mit Beispiel-Aufgaben:
   ```bash
   php artisan db:seed --force
   ```
6. Starten oder deployen Sie die Anwendung. Das Frontend greift anschließend automatisch auf die Laravel-API zu.

## Entwicklung starten

```bash
php artisan serve
```

Die Anwendung ist anschließend unter <http://localhost:8000> erreichbar. Das Frontend kommuniziert automatisch mit den Laravel-API-Endpunkten (`/api/todos`).

## Deployment auf Shared Hosting

1. Laden Sie den gesamten Projektordner (ohne `vendor`) auf den Webspace hoch.
2. Installieren Sie die Composer-Abhängigkeiten direkt auf dem Server (z. B. via SSH):
   ```bash
   composer install --no-dev --optimize-autoloader
   ```
3. Setzen Sie die Dateiberechtigungen für `storage/` und `bootstrap/cache/` auf schreibbar.
4. Hinterlegen Sie eine produktive `.env`-Datei mit den korrekten Zugangsdaten Ihrer neuen MySQL-Instanz (`baduyrxbnk`).
5. Führen Sie Migrationen und optionale Seeds aus:
   ```bash
   php artisan migrate --force
   php artisan db:seed --force
   ```
6. Konfigurieren Sie den Document-Root Ihres Hostings so, dass er auf den Ordner `public/` zeigt.
7. Aktivieren Sie falls nötig mod_rewrite bzw. die Laravel `.htaccess`-Regeln im Hosting.

## API-Überblick

| Methode | Route           | Beschreibung                   |
|---------|-----------------|--------------------------------|
| GET     | `/api/todos`    | Listet alle Aufgaben           |
| POST    | `/api/todos`    | Erstellt eine neue Aufgabe     |
| PATCH   | `/api/todos/{id}` | Aktualisiert eine bestehende Aufgabe |
| DELETE  | `/api/todos/{id}` | Löscht eine Aufgabe           |

Alle Routen liefern und erwarten JSON. Die Validierung erfolgt serverseitig über Laravel und gibt bei Fehlern einen HTTP-Status ≥ 400 mit Fehlermeldung zurück.

## Frontend-Konfiguration

Optional können Sie eine Datei `public/app.config.js` anlegen, um eine abweichende API-URL zu konfigurieren:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://example.com/api",
};
```

Standardmäßig greift das Frontend auf `/api` relativ zur aktuellen Domain zu.

## Passwörter

* Admin: `bauen2024`
* Viewer: `anschauen`

Diese Kennwörter sind weiterhin clientseitig hinterlegt und dienen als einfacher Zugriffsschutz. Für echte Authentifizierung empfiehlt sich ein Laravel-Login mit User-Modell.
