import Database from "better-sqlite3";
import path from "node:path";

export function resolveAppDbPath() {
  return process.env.APP_DB_PATH ?? path.join(process.cwd(), "app.db");
}

export function createAppDatabase(dbPath = resolveAppDbPath()): Database.Database {
  return new Database(dbPath);
}
