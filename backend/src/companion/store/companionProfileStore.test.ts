import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { ensureAppSchema } from "../../db/schema";
import { createCompanionProfileStore } from "./companionProfileStore";
import { createRelationshipStateStore } from "./relationshipStateStore";

describe("companion stores", () => {
  it("persists and reloads the user companion profile and relationship state", () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);
    db.prepare(
      "INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)",
    ).run("usr_1", "2026-05-22T00:00:00.000Z", "2026-05-22T00:00:00.000Z");

    const profileStore = createCompanionProfileStore(db);
    const relationshipStore = createRelationshipStateStore(db);

    profileStore.upsert({
      userId: "usr_1",
      mode: "real",
      archetype: "gentle-older",
      personalitySeedJson: JSON.stringify({ softness: 0.8 }),
      presentationSeedJson: JSON.stringify({ dreaminess: 0.7 }),
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
    });

    relationshipStore.upsert({
      userId: "usr_1",
      stage: "initial",
      intimacyScore: 5,
      initiativeScore: 35,
      recallScore: 20,
      boundaryFitScore: 50,
      styleAlignmentScore: 40,
      lastCalibratedAt: null,
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
    });

    expect(profileStore.findByUserId("usr_1")?.archetype).toBe("gentle-older");
    expect(relationshipStore.findByUserId("usr_1")?.initiativeScore).toBe(35);
  });
});