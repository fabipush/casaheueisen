import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const dbHost = process.env.DB_HOST || "localhost";
if (!process.env.DB_HOST) {
  console.warn("DB_HOST is not set. Using localhost as fallback.");
}

const pool = mysql.createPool({
  host: dbHost,
  user: process.env.DB_USER || "dbu2588999",
  password: process.env.DB_PASSWORD || "casaheueisen2025",
  database: process.env.DB_NAME || "dbs14937341",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: false },
});

async function ensureSchema() {
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
    const defaultTodos = [
      {
        id: randomUUID(),
        title: "Baustellenschild aktualisieren",
        scope: "general",
        room: null,
        notes: "Neue Telefonnummer für Bauleiter ergänzen",
        completed: 0,
      },
      {
        id: randomUUID(),
        title: "Elektroinstallation prüfen",
        scope: "room",
        room: "Küche",
        notes: "Steckdosenplan mit Elektriker abstimmen",
        completed: 1,
      },
      {
        id: randomUUID(),
        title: "Estrich abnehmen",
        scope: "room",
        room: "Bad",
        notes: "Feuchtigkeit messen und dokumentieren",
        completed: 0,
      },
    ];

    for (const todo of defaultTodos) {
      await pool.query(
        `INSERT INTO todos (id, title, scope, room, notes, completed) VALUES (?, ?, ?, ?, ?, ?)`,
        [todo.id, todo.title, todo.scope, todo.room, todo.notes, todo.completed]
      );
    }
  }
}

app.get("/api/todos", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, scope, room, notes, completed FROM todos ORDER BY created_at DESC"
    );
    res.json(
      rows.map((row) => ({
        ...row,
        completed: Boolean(row.completed),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch todos", error);
    res.status(500).json({ message: "Konnte Aufgaben nicht laden." });
  }
});

app.post("/api/todos", async (req, res) => {
  const { id, title, scope, room, notes, completed } = req.body;
  if (!id || !title || !scope) {
    return res.status(400).json({ message: "Ungültige Daten." });
  }

  try {
    await pool.query(
      `INSERT INTO todos (id, title, scope, room, notes, completed) VALUES (?, ?, ?, ?, ?, ?)` ,
      [id, title, scope, room || null, notes || null, completed ? 1 : 0]
    );
    res.status(201).json({ message: "Aufgabe gespeichert." });
  } catch (error) {
    console.error("Failed to create todo", error);
    res.status(500).json({ message: "Konnte Aufgabe nicht speichern." });
  }
});

app.patch("/api/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { completed, title, scope, room, notes } = req.body;
  const fields = [];
  const values = [];

  if (typeof completed === "boolean") {
    fields.push("completed = ?");
    values.push(completed ? 1 : 0);
  }
  if (title !== undefined) {
    fields.push("title = ?");
    values.push(title);
  }
  if (scope !== undefined) {
    fields.push("scope = ?");
    values.push(scope);
  }
  if (room !== undefined) {
    fields.push("room = ?");
    values.push(room || null);
  }
  if (notes !== undefined) {
    fields.push("notes = ?");
    values.push(notes || null);
  }

  if (!fields.length) {
    return res.status(400).json({ message: "Keine Änderungen angegeben." });
  }

  values.push(id);

  try {
    const [result] = await pool.query(
      `UPDATE todos SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden." });
    }
    res.json({ message: "Aufgabe aktualisiert." });
  } catch (error) {
    console.error("Failed to update todo", error);
    res.status(500).json({ message: "Konnte Aufgabe nicht aktualisieren." });
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM todos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Aufgabe nicht gefunden." });
    }
    res.json({ message: "Aufgabe gelöscht." });
  } catch (error) {
    console.error("Failed to delete todo", error);
    res.status(500).json({ message: "Konnte Aufgabe nicht löschen." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
