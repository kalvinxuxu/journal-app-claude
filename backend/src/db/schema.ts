import Database from "better-sqlite3";

export function ensureAppSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companion_profiles (
      user_id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      archetype TEXT NOT NULL,
      personality_seed_json TEXT NOT NULL,
      presentation_seed_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS relationship_states (
      user_id TEXT PRIMARY KEY,
      stage TEXT NOT NULL,
      intimacy_score INTEGER NOT NULL,
      initiative_score INTEGER NOT NULL,
      recall_score INTEGER NOT NULL,
      boundary_fit_score INTEGER NOT NULL,
      style_alignment_score INTEGER NOT NULL,
      last_calibrated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS onboarding_answers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_key TEXT NOT NULL,
      answer_value TEXT NOT NULL,
      answer_weight REAL NOT NULL DEFAULT 1,
      answered_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS memory_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      journal_id TEXT,
      memory_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      salience_score INTEGER NOT NULL,
      recall_score INTEGER NOT NULL,
      is_structured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS interaction_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      journal_id TEXT,
      feedback_kind TEXT NOT NULL,
      feedback_value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS unlock_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_key TEXT NOT NULL,
      event_summary TEXT NOT NULL,
      surfaced_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}