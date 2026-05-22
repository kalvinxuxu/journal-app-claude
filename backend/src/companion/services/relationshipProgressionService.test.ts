import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { ensureAppSchema } from "../../db/schema";

describe("ensureAppSchema", () => {
  it("creates all companion tables needed for the memory companion domain", () => {
    const db = new Database(":memory:");

    ensureAppSchema(db);

    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String((row as { name: string }).name));

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "users",
        "companion_profiles",
        "relationship_states",
        "onboarding_answers",
        "memory_items",
        "interaction_feedback",
        "unlock_events",
      ]),
    );
  });
});
