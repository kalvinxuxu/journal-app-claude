import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { ensureAppSchema } from "../../db/schema";
import { createCompanionProfileStore } from "../store/companionProfileStore";
import { createRelationshipStateStore } from "../store/relationshipStateStore";
import { createOnboardingAnswerStore } from "../store/onboardingAnswerStore";
import { createOnboardingService } from "./onboardingService";

describe("createOnboardingService", () => {
  it("creates the initial companion profile and relationship state after 3-5 answers", () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);
    db.prepare(
      "INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)",
    ).run("usr_1", "2026-05-22T00:00:00.000Z", "2026-05-22T00:00:00.000Z");

    const service = createOnboardingService({
      onboardingAnswerStore: createOnboardingAnswerStore(db),
      companionProfileStore: createCompanionProfileStore(db),
      relationshipStateStore: createRelationshipStateStore(db),
    });

    const result = service.submitInitialAnswers("usr_1", [
      { questionKey: "entry_mode", answerValue: "real" },
      { questionKey: "initiative_preference", answerValue: "balanced" },
      { questionKey: "ideal_presence", answerValue: "gentle_older" },
    ]);

    expect(result.profile.archetype).toBe("gentle_older");
    expect(result.relationship.stage).toBe("initial");
    expect(result.relationship.initiativeScore).toBeGreaterThan(20);
  });
});