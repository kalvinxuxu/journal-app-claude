import Database from "better-sqlite3";
import type { FeedbackKind } from "../types";

export type InteractionFeedbackRecord = {
  id: string;
  userId: string;
  journalId: string | null;
  feedbackKind: FeedbackKind;
  feedbackValue: string;
  createdAt: string;
};

export function createFeedbackStore(db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT INTO interaction_feedback (
      id, user_id, journal_id, feedback_kind, feedback_value, created_at
    ) VALUES (
      @id, @userId, @journalId, @feedbackKind, @feedbackValue, @createdAt
    )
  `);

  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM interaction_feedback
    WHERE user_id = ?
  `);

  return {
    insert(record: InteractionFeedbackRecord) {
      insertStmt.run(record);
    },
    countByUserId(userId: string) {
      const row = countStmt.get(userId) as { count: number };
      return row.count;
    },
  };
}