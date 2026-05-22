import Database from "better-sqlite3";
import type { CompanionProfileRecord } from "../types";

export function createCompanionProfileStore(db: Database.Database) {
  const upsertStmt = db.prepare(`
    INSERT INTO companion_profiles (
      user_id, mode, archetype, personality_seed_json, presentation_seed_json, created_at, updated_at
    ) VALUES (
      @userId, @mode, @archetype, @personalitySeedJson, @presentationSeedJson, @createdAt, @updatedAt
    )
    ON CONFLICT(user_id) DO UPDATE SET
      mode = excluded.mode,
      archetype = excluded.archetype,
      personality_seed_json = excluded.personality_seed_json,
      presentation_seed_json = excluded.presentation_seed_json,
      updated_at = excluded.updated_at
  `);

  const findStmt = db.prepare(`
    SELECT
      user_id as userId,
      mode,
      archetype,
      personality_seed_json as personalitySeedJson,
      presentation_seed_json as presentationSeedJson,
      created_at as createdAt,
      updated_at as updatedAt
    FROM companion_profiles
    WHERE user_id = ?
  `);

  return {
    upsert(record: CompanionProfileRecord) {
      upsertStmt.run(record);
    },
    findByUserId(userId: string) {
      return findStmt.get(userId) as CompanionProfileRecord | undefined;
    },
  };
}