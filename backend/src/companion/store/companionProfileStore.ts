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

  const updatePortraitStmt = db.prepare(`
    UPDATE companion_profiles
    SET presentation_seed_json = @presentationSeedJson,
        updated_at = @updatedAt
    WHERE user_id = @userId
  `);

  return {
    upsert(record: CompanionProfileRecord) {
      upsertStmt.run(record);
    },
    updatePortraitImageUrl(userId: string, portraitImageUrl: string, updatedAt: string) {
      const profile = findStmt.get(userId) as CompanionProfileRecord | undefined;
      if (!profile) return false;

      let presentationSeed: Record<string, unknown> = {};
      try {
        presentationSeed = JSON.parse(profile.presentationSeedJson) as Record<string, unknown>;
      } catch {
        presentationSeed = {};
      }

      updatePortraitStmt.run({
        userId,
        updatedAt,
        presentationSeedJson: JSON.stringify({
          ...presentationSeed,
          portraitImageUrl,
        }),
      });
      return true;
    },
    updateCustomName(userId: string, customName: string, updatedAt: string) {
      const profile = findStmt.get(userId) as CompanionProfileRecord | undefined;
      if (!profile) return null;

      const patchPresentationSeed = (presentationSeedJson: string, patch: Record<string, unknown>) => {
        const current = JSON.parse(presentationSeedJson) as Record<string, unknown>;
        return JSON.stringify({ ...current, ...patch });
      };

      upsertStmt.run({
        ...profile,
        presentationSeedJson: patchPresentationSeed(profile.presentationSeedJson, { customName }),
        updatedAt,
      });

      return findStmt.get(userId) as CompanionProfileRecord | undefined;
    },
    findByUserId(userId: string) {
      return findStmt.get(userId) as CompanionProfileRecord | undefined;
    },
  };
}
