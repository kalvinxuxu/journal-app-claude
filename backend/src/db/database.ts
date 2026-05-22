import Database from "better-sqlite3";
import path from "node:path";

export function resolveAppDbPath() {
  return process.env.APP_DB_PATH ?? path.join(process.cwd(), "app.db");
}

export function createAppDatabase(dbPath = resolveAppDbPath()) {
  return new Database(dbPath);
}
