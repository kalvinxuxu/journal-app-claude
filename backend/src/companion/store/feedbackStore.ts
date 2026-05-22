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

  return {
    insert(record: InteractionFeedbackRecord) {
      insertStmt.run(record);
    },
  };
}