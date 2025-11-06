<?php
// Einfache REST-API für Strato Shared Hosting (PHP 8.x), um Todos aus MySQL zu verwalten.
// Upload dieses Ordners (`api/`) zusammen mit den Frontend-Dateien in den Webspace.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Optionales CORS-Handling, falls Frontend auf anderer Domain liegt
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
if ($origin) {
    header('Vary: Origin');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Konfiguration nicht gefunden. Bitte `api/config.php` aus `config.sample.php` erstellen.',
    ]);
    exit;
}

$config = require $configPath;

$tablePrefix = $config['table_prefix'] ?? '';
$tableName = $tablePrefix . 'todos';

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_port'] ?? 3306,
        $config['db_name']
    );
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Keine Verbindung zur Datenbank möglich.',
        'details' => $error->getMessage(),
    ]);
    exit;
}

// Tabelle erstellen, falls sie fehlt
$createTableSql = <<<SQL
CREATE TABLE IF NOT EXISTS `$tableName` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `scope` VARCHAR(32) NOT NULL DEFAULT 'general',
  `room` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;

$pdo->exec($createTableSql);

// Optionale Seed-Einträge
$existingCount = (int) $pdo->query("SELECT COUNT(*) FROM `$tableName`")->fetchColumn();
if ($existingCount === 0) {
    $seedSql = "INSERT INTO `$tableName` (id, title, scope, room, notes, completed) VALUES
        (:id1, 'Baustellenschild aktualisieren', 'general', NULL, 'Neue Telefonnummer für Bauleiter ergänzen', 0),
        (:id2, 'Elektroinstallation prüfen', 'room', 'Küche', 'Steckdosenplan mit Elektriker abstimmen', 1),
        (:id3, 'Estrich abnehmen', 'room', 'Bad', 'Feuchtigkeit messen und dokumentieren', 0)
    ";
    $stmt = $pdo->prepare($seedSql);
    $stmt->execute([
        ':id1' => generateId(),
        ':id2' => generateId(),
        ':id3' => generateId(),
    ]);
}

$path = $_SERVER['PATH_INFO'] ?? '';
if ($path === '' && isset($_SERVER['REQUEST_URI'], $_SERVER['SCRIPT_NAME'])) {
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
    if ($base !== '' && strpos($requestUri, $base) === 0) {
        $path = substr($requestUri, strlen($base));
    } else {
        $path = $requestUri;
    }
}
$path = trim($path, '/');
$segments = $path === '' ? [] : explode('/', $path);

$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;

if ($resource !== 'todos') {
    http_response_code(404);
    echo json_encode(['error' => 'Endpunkt nicht gefunden']);
    exit;
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGetTodos($pdo, $tableName);
        break;
    case 'POST':
        handleCreateTodo($pdo, $tableName);
        break;
    case 'PATCH':
        if (!$id) {
            respondValidation('Eine ID wird benötigt, um eine Aufgabe zu aktualisieren.');
        }
        handlePatchTodo($pdo, $tableName, $id);
        break;
    case 'DELETE':
        if (!$id) {
            respondValidation('Eine ID wird benötigt, um eine Aufgabe zu löschen.');
        }
        handleDeleteTodo($pdo, $tableName, $id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Methode nicht erlaubt']);
}

function handleGetTodos(PDO $pdo, string $tableName): void
{
    $stmt = $pdo->query("SELECT id, title, scope, room, notes, completed, created_at FROM `$tableName` ORDER BY created_at DESC");
    $todos = $stmt->fetchAll();

    array_walk($todos, static function (&$todo) {
        $todo['completed'] = (bool) $todo['completed'];
        if ($todo['room'] === null) {
            unset($todo['room']);
        }
    });

    echo json_encode($todos);
}

function handleCreateTodo(PDO $pdo, string $tableName): void
{
    $data = readJson();

    $title = trim($data['title'] ?? '');
    $scope = $data['scope'] === 'room' ? 'room' : 'general';
    $room = $scope === 'room' ? trim($data['room'] ?? '') : null;
    $notes = trim($data['notes'] ?? '');

    if ($title === '') {
        respondValidation('Titel darf nicht leer sein.');
    }
    if ($scope === 'room' && $room === '') {
        respondValidation('Bitte einen Raum auswählen.');
    }

    $id = generateId();

    $stmt = $pdo->prepare("INSERT INTO `$tableName` (id, title, scope, room, notes, completed) VALUES (:id, :title, :scope, :room, :notes, 0)");
    $stmt->execute([
        ':id' => $id,
        ':title' => $title,
        ':scope' => $scope,
        ':room' => $room ?: null,
        ':notes' => $notes,
    ]);

    http_response_code(201);
    echo json_encode([
        'id' => $id,
        'title' => $title,
        'scope' => $scope,
        'room' => $room ?: null,
        'notes' => $notes,
        'completed' => false,
    ]);
}

function handlePatchTodo(PDO $pdo, string $tableName, string $id): void
{
    $data = readJson();

    if (!array_key_exists('completed', $data)) {
        respondValidation('Das Feld `completed` muss gesetzt werden.');
    }

    $completed = filter_var($data['completed'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($completed === null) {
        respondValidation('`completed` muss true oder false sein.');
    }

    $stmt = $pdo->prepare("UPDATE `$tableName` SET completed = :completed WHERE id = :id");
    $stmt->execute([
        ':completed' => $completed ? 1 : 0,
        ':id' => $id,
    ]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Aufgabe nicht gefunden']);
        return;
    }

    echo json_encode(['success' => true]);
}

function handleDeleteTodo(PDO $pdo, string $tableName, string $id): void
{
    $stmt = $pdo->prepare("DELETE FROM `$tableName` WHERE id = :id");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Aufgabe nicht gefunden']);
        return;
    }

    http_response_code(204);
}

function respondValidation(string $message): void
{
    http_response_code(422);
    echo json_encode(['error' => $message]);
    exit;
}

function readJson(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        respondValidation('Konnte Anfrage nicht lesen.');
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        respondValidation('Ungültige JSON-Nutzdaten.');
    }

    return $data;
}

function generateId(): string
{
    return bin2hex(random_bytes(8)) . '-' . bin2hex(random_bytes(4));
}
