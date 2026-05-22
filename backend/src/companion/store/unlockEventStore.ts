import Database from "better-sqlite3";

export type UnlockEventRecord = {
  id: string;
  userId: string;
  eventKey: string;
  eventSummary: string;
  surfacedAt: string | null;
  createdAt: string;
};

export function createUnlockEventStore(db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT INTO unlock_events (
      id, user_id, event_key, event_summary, surfaced_at, created_at
    ) VALUES (
      @id, @userId, @eventKey, @eventSummary, @surfacedAt, @createdAt
    )
  `);

  const listUnsurfacedStmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      event_key as eventKey,
      event_summary as eventSummary,
      surfaced_at as surfacedAt,
      created_at as createdAt
    FROM unlock_events
    WHERE user_id = ? AND surfaced_at IS NULL
    ORDER BY created_at ASC
  `);

  return {
    insert(record: UnlockEventRecord) {
      insertStmt.run(record);
    },
    listUnsurfaced(userId: string) {
      return listUnsurfacedStmt.all(userId) as UnlockEventRecord[];
    },
  };
}