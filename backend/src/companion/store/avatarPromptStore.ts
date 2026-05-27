import type { Database } from "better-sqlite3";
import type { AvatarPromptRecord, AvatarResultRecord } from "../types/avatarChoiceLoop";

export function createAvatarPromptStore(db: Database.Database) {
  return {
    insertPrompt(record: AvatarPromptRecord) {
      db.prepare(`
        INSERT INTO companion_avatar_prompts (
          id, user_id, prompt_type, prompt_text, options_json, status,
          scheduled_for, responded_at, selected_option_id, acknowledgement_text,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.userId,
        record.promptType,
        record.promptText,
        JSON.stringify(record.options),
        record.status,
        record.scheduledFor,
        record.respondedAt,
        record.selectedOptionId,
        record.acknowledgementText,
        record.createdAt,
        record.updatedAt,
      );
    },

    findActivePrompt(userId: string, nowIso: string): AvatarPromptRecord | null {
      const row = db.prepare(`
        SELECT * FROM companion_avatar_prompts
        WHERE user_id = ? AND status IN ('scheduled', 'active') AND scheduled_for <= ?
        ORDER BY scheduled_for ASC
        LIMIT 1
      `).get(userId, nowIso) as any;
      if (!row) return null;
      return {
        id: row.id,
        userId: row.user_id,
        promptType: row.prompt_type,
        promptText: row.prompt_text,
        options: JSON.parse(row.options_json),
        status: row.status,
        scheduledFor: row.scheduled_for,
        respondedAt: row.responded_at,
        selectedOptionId: row.selected_option_id,
        acknowledgementText: row.acknowledgement_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    markAnswered(params: { userId: string; promptId: string; selectedOptionId: string; acknowledgementText: string; respondedAt: string }) {
      db.prepare(`
        UPDATE companion_avatar_prompts
        SET status = 'answered', selected_option_id = ?, acknowledgement_text = ?, responded_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(params.selectedOptionId, params.acknowledgementText, params.respondedAt, params.respondedAt, params.promptId, params.userId);
    },

    insertResult(record: AvatarResultRecord) {
      db.prepare(`
        INSERT INTO companion_avatar_results (
          id, user_id, prompt_id, result_kind, title, body, image_url, metadata_json,
          surfaced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.userId,
        record.promptId,
        record.resultKind,
        record.title,
        record.body,
        record.imageUrl,
        JSON.stringify(record.metadata),
        record.surfacedAt,
        record.createdAt,
        record.updatedAt,
      );
    },

    listUnsurfacedResults(userId: string): AvatarResultRecord[] {
      const rows = db.prepare(`
        SELECT * FROM companion_avatar_results
        WHERE user_id = ? AND surfaced_at IS NULL
        ORDER BY created_at ASC
      `).all(userId) as any[];
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        promptId: row.prompt_id,
        resultKind: row.result_kind,
        title: row.title,
        body: row.body,
        imageUrl: row.image_url,
        metadata: JSON.parse(row.metadata_json),
        surfacedAt: row.surfaced_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },

    markResultSurfaced(resultId: string, surfacedAt: string) {
      db.prepare(`
        UPDATE companion_avatar_results
        SET surfaced_at = ?, updated_at = ?
        WHERE id = ?
      `).run(surfacedAt, surfacedAt, resultId);
    },
  };
}