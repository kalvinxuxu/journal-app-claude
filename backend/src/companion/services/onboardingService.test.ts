import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { ensureAppSchema } from "../../db/schema";
import { createCompanionProfileStore } from "../store/companionProfileStore";
import { createRelationshipStateStore } from "../store/relationshipStateStore";
import { createOnboardingAnswerStore } from "../store/onboardingAnswerStore";
import { createOnboardingService } from "./onboardingService";

describe("createOnboardingService", () => {
  it("builds a richer reveal from intake, user profile answers, and companion preference answers", () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
      "usr_richer",
      "2026-05-22T00:00:00.000Z",
      "2026-05-22T00:00:00.000Z",
    );

    const service = createOnboardingService({
      onboardingAnswerStore: createOnboardingAnswerStore(db),
      companionProfileStore: createCompanionProfileStore(db),
      relationshipStateStore: createRelationshipStateStore(db),
    });

    const result = service.submitInitialAnswers("usr_richer", {
      intake: { entryMode: "real" },
      userProfileAnswers: [
        { questionKey: "social_energy", answerValue: "slow_warm" },
        { questionKey: "emotional_texture", answerValue: "sensitive_deep" },
        { questionKey: "expression_style", answerValue: "restrained" },
      ],
      companionPreferenceAnswers: [
        { questionKey: "temperament", answerValue: "mature_steady" },
        { questionKey: "affection_style", answerValue: "gentle_attentive" },
        { questionKey: "distance_style", answerValue: "poised" },
        { questionKey: "initiative_style", answerValue: "measured_forward" },
        { questionKey: "expression_tone", answerValue: "light_proud" },
        { questionKey: "hair_style", answerValue: "long_hair" },
        { questionKey: "body_presence", answerValue: "balanced_mature" },
      ],
    });

    expect(result.reveal.systemDisplayName).toBeTruthy();
    expect(result.reveal.customName).toBeNull();
    expect(result.reveal.appearanceProfile.hairStyle).toBe("long_hair");
    expect(result.reveal.personalityProfile.temperament).toBe("mature_steady");
    expect(result.reveal.tagline).not.toContain("交给你");
    expect(result.reveal.portraitDescription.length).toBeGreaterThan(60);
    expect(result.reveal.matchExplanation.length).toBeGreaterThan(40);
  });
});