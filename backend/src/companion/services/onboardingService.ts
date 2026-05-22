import type { CompanionProfileRecord, RelationshipStateRecord } from "../types";
import type { OnboardingAnswerInput } from "../store/onboardingAnswerStore";

type Deps = {
  onboardingAnswerStore: {
    insertMany: (userId: string, answers: OnboardingAnswerInput[], nowIso: string) => void;
  };
  companionProfileStore: {
    upsert: (record: CompanionProfileRecord) => void;
  };
  relationshipStateStore: {
    upsert: (record: RelationshipStateRecord) => void;
  };
};

export function createOnboardingService(deps: Deps) {
  return {
    submitInitialAnswers(userId: string, answers: OnboardingAnswerInput[]) {
      const nowIso = new Date().toISOString();
      deps.onboardingAnswerStore.insertMany(userId, answers, nowIso);

      const entryMode = answers.find((a) => a.questionKey === "entry_mode")?.answerValue ?? "real";
      const archetype = answers.find((a) => a.questionKey === "ideal_presence")?.answerValue ?? "gentle_older";
      const initiativePref = answers.find((a) => a.questionKey === "initiative_preference")?.answerValue ?? "balanced";

      const initiativeScore = initiativePref === "low"
        ? 25
        : initiativePref === "high"
          ? 55
          : 40;

      const profile: CompanionProfileRecord = {
        userId,
        mode: entryMode === "fantasy" ? "fantasy" : "real",
        archetype,
        personalitySeedJson: JSON.stringify({ initiativePref, archetype }),
        presentationSeedJson: JSON.stringify({ dreaminess: entryMode === "fantasy" ? 0.85 : 0.55 }),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const relationship: RelationshipStateRecord = {
        userId,
        stage: "initial",
        intimacyScore: 5,
        initiativeScore,
        recallScore: 15,
        boundaryFitScore: 50,
        styleAlignmentScore: 35,
        lastCalibratedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      deps.companionProfileStore.upsert(profile);
      deps.relationshipStateStore.upsert(relationship);

      return { profile, relationship };
    },
  };
}