import http from "http";
import { readFileSync, existsSync, createReadStream } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv();
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

const port = Number.parseInt(process.env.PORT || "3000", 10);
if (Number.isNaN(port)) {
  throw new Error(`Ungültiger PORT-Wert: ${process.env.PORT}`);
}

const server = http.createServer(async (req, res) => {
  try {
    enableCors(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest(req, res, url);
      return;
    }

    await serveStaticFile(res, url);
  } catch (error) {
    console.error("Unerwarteter Serverfehler", error);
    sendJson(res, 500, {
      message: "Interner Serverfehler",
      details: "Bitte versuchen Sie es später erneut.",
    });
  }
});

const dataStorePromise = initializeDataStore();

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

async function handleApiRequest(req, res, url) {
  const dataStore = await dataStorePromise;

  if (url.pathname === "/api/health" && req.method === "GET") {
    const health = await dataStore.health();
    sendJson(res, 200, health);
    return;
  }

  if (url.pathname === "/api/todos" && req.method === "GET") {
    const items = await dataStore.list();
    sendJson(res, 200, items);
    return;
  }

  if (url.pathname === "/api/todos" && req.method === "POST") {
    const payload = await readJsonBody(req);
    if (!payload || typeof payload.id !== "string" || !payload.id) {
      sendJson(res, 400, { message: "Ungültige Daten." });
      return;
    }
    if (!payload.title || typeof payload.scope !== "string") {
      sendJson(res, 400, { message: "Ungültige Daten." });
      return;
    }

    await dataStore.create({
      id: payload.id,
      title: payload.title,
      scope: payload.scope,
      room: payload.room ?? null,
      notes: payload.notes ?? null,
      completed: Boolean(payload.completed),
    });

    sendJson(res, 201, { message: "Aufgabe gespeichert." });
    return;
  }

  if (url.pathname.startsWith("/api/todos/") && req.method === "PATCH") {
    const id = url.pathname.split("/").at(-1);
    const payload = await readJsonBody(req);

    const fields = {};
    if (payload && Object.prototype.hasOwnProperty.call(payload, "completed")) {
      if (typeof payload.completed !== "boolean") {
        sendJson(res, 400, { message: "Ungültiger completed-Wert." });
        return;
      }
      fields.completed = payload.completed;
    }
    if (payload?.title !== undefined) {
      fields.title = payload.title;
    }
    if (payload?.scope !== undefined) {
      fields.scope = payload.scope;
    }
    if (payload?.room !== undefined) {
      fields.room = payload.room;
    }
    if (payload?.notes !== undefined) {
      fields.notes = payload.notes;
    }

    if (!Object.keys(fields).length) {
      sendJson(res, 400, { message: "Keine Änderungen angegeben." });
      return;
    }

    const updated = await dataStore.update(id, fields);
    if (!updated) {
      sendJson(res, 404, { message: "Aufgabe nicht gefunden." });
      return;
    }

    sendJson(res, 200, { message: "Aufgabe aktualisiert." });
    return;
  }

  if (url.pathname.startsWith("/api/todos/") && req.method === "DELETE") {
    const id = url.pathname.split("/").at(-1);
    const removed = await dataStore.remove(id);
    if (!removed) {
      sendJson(res, 404, { message: "Aufgabe nicht gefunden." });
      return;
    }
    sendJson(res, 200, { message: "Aufgabe gelöscht." });
    return;
  }

  sendJson(res, 404, { message: "Nicht gefunden" });
}

async function serveStaticFile(res, url) {
  let requestedPath = url.pathname;
  if (requestedPath === "/") {
    requestedPath = "/index.html";
  }

  const absolutePath = path.join(PUBLIC_DIR, path.normalize(requestedPath));
  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { message: "Zugriff verweigert" });
    return;
  }

  if (!existsSync(absolutePath)) {
    const indexPath = path.join(PUBLIC_DIR, "index.html");
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[".html"],
    });
    createReadStream(indexPath).pipe(res);
    return;
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  createReadStream(absolutePath).pipe(res);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (!chunks.length) {
    return null;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    console.warn("Konnte Request-Body nicht parsen", error);
    return null;
  }
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
}

function enableCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
}

async function initializeDataStore() {
  try {
    const mysqlStore = await tryCreateMysqlStore();
    if (mysqlStore) {
      console.info("MySQL-Datenbankmodus aktiviert.");
      return mysqlStore;
    }
  } catch (error) {
    console.warn(
      "MySQL konnte nicht initialisiert werden. Es wird auf den Dateispeicher zurückgegriffen.",
      error
    );
  }

  const filePath = path.join(__dirname, "data", "todos.json");
  const fileStore = createFileStore(filePath);
  await fileStore.ensure();
  console.info("Fallback auf lokale JSON-Datei (data/todos.json).");
  return fileStore;
}

async function tryCreateMysqlStore() {
  const host = process.env.DB_HOST;
  if (!host) {
    console.info("Keine DB_HOST-Variable gesetzt – Datenbank wird übersprungen.");
    return null;
  }

  let mysql;
  try {
    mysql = await import("mysql2/promise");
  } catch (error) {
    console.warn(
      "mysql2 ist nicht installiert. Führe 'npm install mysql2' aus, um die Datenbank zu nutzen."
    );
    return null;
  }

  const useSsl = /^true$/i.test(process.env.DB_SSL || "");
  const port = Number.parseInt(process.env.DB_PORT || "3306", 10);
  if (Number.isNaN(port)) {
    throw new Error(`Ungültiger DB_PORT-Wert: ${process.env.DB_PORT}`);
  }

  const connectionLimit = Number.parseInt(
    process.env.DB_CONNECTION_LIMIT || "10",
    10
  );
  if (Number.isNaN(connectionLimit)) {
    throw new Error(
      `Ungültiger DB_CONNECTION_LIMIT-Wert: ${process.env.DB_CONNECTION_LIMIT}`
    );
  }

  let sslOptions;
  if (useSsl) {
    sslOptions = { rejectUnauthorized: false };
    if (process.env.DB_SSL_CA) {
      try {
        sslOptions.ca = readFileSync(process.env.DB_SSL_CA, "utf8");
        console.info("Custom CA für MySQL SSL geladen.");
      } catch (error) {
        console.warn(
          `Konnte Datei aus DB_SSL_CA nicht laden (${process.env.DB_SSL_CA}): ${error.message}`
        );
      }
    }
  }

  const pool = mysql.createPool({
    host,
    port,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    ssl: sslOptions,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      scope ENUM('general', 'room') NOT NULL DEFAULT 'general',
      room VARCHAR(255) NULL,
      notes TEXT NULL,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await pool.query("SELECT COUNT(*) as count FROM todos");
  if (rows[0].count === 0) {
    const defaults = defaultTodos();
    for (const todo of defaults) {
      await pool.query(
        `INSERT INTO todos (id, title, scope, room, notes, completed) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          todo.id,
          todo.title,
          todo.scope,
          todo.room,
          todo.notes,
          todo.completed ? 1 : 0,
        ]
      );
    }
  }

  return {
    async ensure() {},
    async list() {
      const [items] = await pool.query(
        "SELECT id, title, scope, room, notes, completed FROM todos ORDER BY created_at DESC"
      );
      return items.map((item) => ({
        ...item,
        completed: Boolean(item.completed),
      }));
    },
    async create(todo) {
      await pool.query(
        `INSERT INTO todos (id, title, scope, room, notes, completed) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          todo.id,
          todo.title,
          todo.scope,
          todo.room,
          todo.notes,
          todo.completed ? 1 : 0,
        ]
      );
    },
    async update(id, fields) {
      const updates = [];
      const values = [];

      if (Object.prototype.hasOwnProperty.call(fields, "completed")) {
        updates.push("completed = ?");
        values.push(fields.completed ? 1 : 0);
      }
      if (fields.title !== undefined) {
        updates.push("title = ?");
        values.push(fields.title);
      }
      if (fields.scope !== undefined) {
        updates.push("scope = ?");
        values.push(fields.scope);
      }
      if (fields.room !== undefined) {
        updates.push("room = ?");
        values.push(fields.room ?? null);
      }
      if (fields.notes !== undefined) {
        updates.push("notes = ?");
        values.push(fields.notes ?? null);
      }

      if (!updates.length) {
        return false;
      }

      values.push(id);
      const [result] = await pool.query(
        `UPDATE todos SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
      return result.affectedRows > 0;
    },
    async remove(id) {
      const [result] = await pool.query("DELETE FROM todos WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
    async health() {
      try {
        await pool.query("SELECT 1 AS ok");
        return { status: "ok", mode: "mysql", timestamp: new Date().toISOString() };
      } catch (error) {
        return {
          status: "error",
          mode: "mysql",
          message: "Keine Verbindung zur Datenbank möglich.",
          code: error.code,
        };
      }
    },
  };
}

function createFileStore(filePath) {
  return {
    async ensure() {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      if (!existsSync(filePath)) {
        const defaults = defaultTodos();
        await fs.writeFile(filePath, JSON.stringify(defaults, null, 2), "utf8");
      }
    },
    async list() {
      const raw = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(raw);
      return data
        .map((item) => ({
          ...item,
          completed: Boolean(item.completed),
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async create(todo) {
      const items = await this.list();
      items.unshift({
        ...todo,
        createdAt: new Date().toISOString(),
      });
      await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
    },
    async update(id, fields) {
      const items = await this.list();
      let found = false;
      const updated = items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        found = true;
        return {
          ...item,
          ...fields,
        };
      });
      if (!found) {
        return false;
      }
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2), "utf8");
      return true;
    },
    async remove(id) {
      const items = await this.list();
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) {
        return false;
      }
      await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), "utf8");
      return true;
    },
    async health() {
      return { status: "ok", mode: "file", timestamp: new Date().toISOString() };
    },
  };
}

function defaultTodos() {
  return [
    {
      id: randomUUID(),
      title: "Baustellenschild aktualisieren",
      scope: "general",
      room: null,
      notes: "Neue Telefonnummer für Bauleiter ergänzen",
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      title: "Elektroinstallation prüfen",
      scope: "room",
      room: "Küche",
      notes: "Steckdosenplan mit Elektriker abstimmen",
      completed: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      title: "Estrich abnehmen",
      scope: "room",
      room: "Bad",
      notes: "Feuchtigkeit messen und dokumentieren",
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const [key, ...rest] = line.split("=");
    if (!key) {
      continue;
    }
    const value = rest.join("=").trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
