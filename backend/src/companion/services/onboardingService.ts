import type { CompanionProfileRecord, CompanionReveal, RelationshipStateRecord } from "../types";
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

export function buildReveal(entryMode: string, initiativePref: string, archetype: string): CompanionReveal {
  const displayName =
    archetype === "gentle_older" ? "岚夕" :
    archetype === "soft_stable" ? "清和" :
    "知暖";

  const tagline =
    archetype === "gentle_older"
      ? "她像夜色里慢慢靠近的人，安静，却不会让你觉得遥远。"
      : archetype === "soft_stable"
        ? "她先给你安静，再把温柔一点点放进相处里。"
        : "她不是吵闹的人，却会在合适的时候故意朝你笑一下。";

  const appearancePrompt = [
    "full body portrait",
    "japanese semi-realistic style",
    "dreamlike but grounded",
    archetype === "gentle_older" ? "soft long hair, elegant dress, calm eye contact" : "",
    archetype === "soft_stable" ? "neat medium hair, light cardigan, gentle posture" : "",
    archetype === "playful_warm" ? "slightly lively posture, warm smile, layered outfit" : "",
    initiativePref === "high" ? "a slightly forward posture" : "a restrained and composed stance",
    entryMode === "fantasy" ? "misty atmosphere, cinematic glow" : "natural light, believable presence",
    "visible full figure",
  ].filter(Boolean).join(", ");

  return {
    displayName,
    tagline,
    appearancePrompt,
    portraitImageUrl: null,
    portraitDescription: `${displayName}给人的第一感觉并不锋利。她站着的时候很稳，像是先把自己的情绪收好，再把注意力轻轻落到你身上。她说话不会很急，可一旦真的看向你，目光里会有一种已经在认真分辨你的感觉。`,
    matchExplanation: initiativePref === "high"
      ? "你给出的答案更接近会主动靠近、但又不失分寸的相处方式，所以她不是冷淡地被摆在那里，而是像会先一步走向你的人。"
      : "你的回答更偏向有距离感却不疏离的靠近方式，所以她不是喧闹地出现，而是先给你安全感，再慢慢把温度放进相处里。",
  };
}

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

      const reveal = buildReveal(entryMode, initiativePref, archetype);
      return { profile, relationship, reveal };
    },

    buildRevealFromProfile(profile: CompanionProfileRecord, relationship: RelationshipStateRecord): CompanionReveal {
      const entryMode = profile.mode;
      const initiativePref = relationship.initiativeScore <= 30 ? "low"
        : relationship.initiativeScore >= 50 ? "high"
        : "balanced";
      return buildReveal(entryMode, initiativePref, profile.archetype);
    },
  };
}