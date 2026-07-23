// Drizzle DB instance for SQLite (local development)
// Uses sql.js — pure WebAssembly, no native compilation needed
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), "data", "app.db");

// Initialized lazily — call initDbConnection() before use
export let sqlite: SqlJsDatabase;
export let db: BaseSQLiteDatabase<"sync", unknown, typeof schema>;

/** Call once on startup. Loads DB from disk or creates a new one. */
export async function initDbConnection() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlite = new SQL.Database(buffer);
  } else {
    sqlite = new SQL.Database();
  }

  // Enable WAL-equivalent pragmas (sql.js runs in-memory; these help on save/load)
  sqlite.run("PRAGMA foreign_keys = ON");

  db = drizzle(sqlite, { schema });
}

/** Persist in-memory database to disk. Call after writes. */
export function saveDb() {
  const data = sqlite.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export { schema };
