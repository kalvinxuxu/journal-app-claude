import Database from "better-sqlite3";
import type { OotdRecord } from "../types";

export function createOotdStore(db: Database.Database) {
  // Migration: add cards_json column if it doesn't exist
  try {
    db.exec(`ALTER TABLE daily_ootd ADD COLUMN cards_json TEXT`);
  } catch {
    // Column already exists, ignore
  }

  const upsertStmt = db.prepare(`
    INSERT INTO daily_ootd (
      id, user_id, date, image_url, title, caption, rationale, style_tags, cards_json, created_at, updated_at
    ) VALUES (
      @id, @userId, @date, @imageUrl, @title, @caption, @rationale, @styleTags, @cardsJson, @createdAt, @updatedAt
    )
    ON CONFLICT(user_id, date) DO UPDATE SET
      image_url = excluded.image_url,
      title = excluded.title,
      caption = excluded.caption,
      rationale = excluded.rationale,
      style_tags = excluded.style_tags,
      cards_json = excluded.cards_json,
      updated_at = excluded.updated_at
  `);

  const findByUserDateStmt = db.prepare(`
    SELECT
      id as id,
      user_id as userId,
      date as date,
      image_url as imageUrl,
      title as title,
      caption as caption,
      rationale as rationale,
      style_tags as styleTags,
      cards_json as cardsJson,
      created_at as createdAt,
      updated_at as updatedAt
    FROM daily_ootd
    WHERE user_id = ? AND date = ?
  `);

  const findLatestByUserStmt = db.prepare(`
    SELECT
      id as id,
      user_id as userId,
      date as date,
      image_url as imageUrl,
      title as title,
      caption as caption,
      rationale as rationale,
      style_tags as styleTags,
      cards_json as cardsJson,
      created_at as createdAt,
      updated_at as updatedAt
    FROM daily_ootd
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT 1
  `);

  const listByUserStmt = db.prepare(`
    SELECT
      id as id,
      user_id as userId,
      date as date,
      image_url as imageUrl,
      title as title,
      caption as caption,
      rationale as rationale,
      style_tags as styleTags,
      cards_json as cardsJson,
      created_at as createdAt,
      updated_at as updatedAt
    FROM daily_ootd
    WHERE user_id = ?
    ORDER BY date DESC
  `);

  return {
    upsert(record: OotdRecord) {
      upsertStmt.run({
        id: record.id,
        userId: record.userId,
        date: record.date,
        imageUrl: record.imageUrl,
        title: record.title,
        caption: record.caption,
        rationale: record.rationale,
        styleTags: JSON.stringify(record.styleTags ?? []),
        cardsJson: JSON.stringify(record.cards ?? null),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    },
    findByUserIdAndDate(userId: string, date: string): OotdRecord | undefined {
      const row = findByUserDateStmt.get(userId, date) as OotdRecord | undefined;
      return row ? deserializeRow(row) : undefined;
    },
    findLatestByUserId(userId: string): OotdRecord | undefined {
      const row = findLatestByUserStmt.get(userId) as OotdRecord | undefined;
      return row ? deserializeRow(row) : undefined;
    },
    listByUserId(userId: string): OotdRecord[] {
      const rows = listByUserStmt.all(userId) as OotdRecord[];
      return rows.map(deserializeRow);
    },
  };
}

function deserializeRow(row: OotdRecord & { cardsJson?: string | null }): OotdRecord {
  let styleTags: string[] = [];
  if (row.styleTags && typeof row.styleTags === "string") {
    try {
      styleTags = JSON.parse(row.styleTags as unknown as string) as string[];
    } catch {
      styleTags = [];
    }
  } else if (Array.isArray(row.styleTags)) {
    styleTags = row.styleTags;
  }

  let cards = row.cards ?? undefined;
  if (row.cardsJson && typeof row.cardsJson === "string") {
    try {
      cards = JSON.parse(row.cardsJson) as OotdRecord["cards"];
    } catch {
      cards = undefined;
    }
  }

  return { ...row, styleTags, cards };
}