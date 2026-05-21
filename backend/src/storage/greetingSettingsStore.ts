import Database from "better-sqlite3";
import type {
  GreetingSettings,
  GreetingTimeSetting,
  GreetingTiming,
} from "./greetingSettings.js";
import { DEFAULT_GREETING_SETTINGS } from "./greetingSettings.js";

export function createGreetingSettingsStore(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS greeting_settings (
      timing TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      time TEXT NOT NULL DEFAULT '08:00',
      voice_style TEXT NOT NULL DEFAULT 'warm',
      timezone INTEGER
    )
  `);

  // Seed defaults if empty
  const existing = db.prepare("SELECT COUNT(*) as count FROM greeting_settings").get() as { count: number };
  if (existing.count === 0) {
    const insert = db.prepare(
      "INSERT INTO greeting_settings (timing, enabled, time, voice_style) VALUES (@timing, @enabled, @time, @voice_style)"
    );
    for (const t of DEFAULT_GREETING_SETTINGS.times) {
      insert.run({ timing: t.timing, enabled: t.enabled ? 1 : 0, time: t.time, voice_style: t.voiceStyle });
    }
  }

  return {
    get(): GreetingSettings {
      const rows = db.prepare("SELECT * FROM greeting_settings").all() as Array<{
        timing: string;
        enabled: number;
        time: string;
        voice_style: string;
      }>;
      return {
        times: rows.map(r => ({
          timing: r.timing as GreetingTiming,
          enabled: Boolean(r.enabled),
          time: r.time,
          voiceStyle: r.voice_style as GreetingTimeSetting["voiceStyle"],
          timezone: (r as { timezone?: number }).timezone ?? undefined,
        })),
      };
    },

    update(partial: Partial<GreetingSettings>): void {
      const upsert = db.prepare(`
        INSERT INTO greeting_settings (timing, enabled, time, voice_style, timezone)
        VALUES (@timing, @enabled, @time, @voice_style, @timezone)
        ON CONFLICT(timing) DO UPDATE SET
          enabled = @enabled, time = @time, voice_style = @voice_style, timezone = @timezone
      `);
      const tx = db.transaction(() => {
        for (const t of partial.times ?? []) {
          upsert.run({ timing: t.timing, enabled: t.enabled ? 1 : 0, time: t.time, voice_style: t.voiceStyle, timezone: t.timezone ?? null });
        }
      });
      tx();
    },
  };
}