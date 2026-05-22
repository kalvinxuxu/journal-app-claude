import Database from "better-sqlite3";

export type MemoryItemRecord = {
  id: string;
  userId: string;
  journalId: string | null;
  memoryType: string;
  summary: string;
  detailJson: string;
  salienceScore: number;
  recallScore: number;
  isStructured: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

export function createMemoryItemStore(db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT INTO memory_items (
      id, user_id, journal_id, memory_type, summary, detail_json,
      salience_score, recall_score, is_structured, created_at, updated_at
    ) VALUES (
      @id, @userId, @journalId, @memoryType, @summary, @detailJson,
      @salienceScore, @recallScore, @isStructured, @createdAt, @updatedAt
    )
  `);

  const listStmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      journal_id as journalId,
      memory_type as memoryType,
      summary,
      detail_json as detailJson,
      salience_score as salienceScore,
      recall_score as recallScore,
      is_structured as isStructured,
      created_at as createdAt,
      updated_at as updatedAt
    FROM memory_items
    WHERE user_id = ?
    ORDER BY salience_score DESC, created_at DESC
  `);

  return {
    insert(record: MemoryItemRecord) {
      insertStmt.run(record);
    },
    listByUserId(userId: string) {
      return listStmt.all(userId) as MemoryItemRecord[];
    },
  };
}