import Database from "better-sqlite3";
import type { RelationshipStateRecord } from "../types";

export function createRelationshipStateStore(db: Database.Database) {
  const upsertStmt = db.prepare(`
    INSERT INTO relationship_states (
      user_id, stage, intimacy_score, initiative_score, recall_score, boundary_fit_score,
      style_alignment_score, last_calibrated_at, created_at, updated_at
    ) VALUES (
      @userId, @stage, @intimacyScore, @initiativeScore, @recallScore, @boundaryFitScore,
      @styleAlignmentScore, @lastCalibratedAt, @createdAt, @updatedAt
    )
    ON CONFLICT(user_id) DO UPDATE SET
      stage = excluded.stage,
      intimacy_score = excluded.intimacy_score,
      initiative_score = excluded.initiative_score,
      recall_score = excluded.recall_score,
      boundary_fit_score = excluded.boundary_fit_score,
      style_alignment_score = excluded.style_alignment_score,
      last_calibrated_at = excluded.last_calibrated_at,
      updated_at = excluded.updated_at
  `);

  const findStmt = db.prepare(`
    SELECT
      user_id as userId,
      stage,
      intimacy_score as intimacyScore,
      initiative_score as initiativeScore,
      recall_score as recallScore,
      boundary_fit_score as boundaryFitScore,
      style_alignment_score as styleAlignmentScore,
      last_calibrated_at as lastCalibratedAt,
      created_at as createdAt,
      updated_at as updatedAt
    FROM relationship_states
    WHERE user_id = ?
  `);

  return {
    upsert(record: RelationshipStateRecord) {
      upsertStmt.run(record);
    },
    findByUserId(userId: string) {
      return findStmt.get(userId) as RelationshipStateRecord | undefined;
    },
  };
}