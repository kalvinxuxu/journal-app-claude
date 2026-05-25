import type { CompanionProfileRecord, CompanionRevealV2, RelationshipStateRecord } from "../types";
import type { OnboardingAnswerInput } from "../store/onboardingAnswerStore";

type Deps = {
  onboardingAnswerStore: {
    insertMany: (userId: string, answers: OnboardingAnswerInput[], nowIso: string, answerPrefix?: string) => void;
  };
  companionProfileStore: {
    upsert: (record: CompanionProfileRecord) => void;
  };
  relationshipStateStore: {
    upsert: (record: RelationshipStateRecord) => void;
  };
};

export type OnboardingIntake = {
  entryMode: "real" | "fantasy";
};

export type OnboardingSubmission = {
  intake: OnboardingIntake;
  userProfileAnswers: OnboardingAnswerInput[];
  companionPreferenceAnswers: OnboardingAnswerInput[];
};

function pickAnswer(answers: OnboardingAnswerInput[], questionKey: string, fallback: string): string {
  return answers.find((answer) => answer.questionKey === questionKey)?.answerValue ?? fallback;
}

function buildAppearanceProfile(answers: OnboardingAnswerInput[]): {
  hairStyle: string;
  bodyPresence: string;
  fashionAura: string;
  gazeStyle: string;
  poseStyle: string;
} {
  const hairStyle = pickAnswer(answers, "hair_style", "long_hair");
  const bodyPresence = pickAnswer(answers, "body_presence", "balanced_mature");
  return {
    hairStyle,
    bodyPresence,
    fashionAura: pickAnswer(answers, "fashion_aura", "stylish_refined"),
    gazeStyle: pickAnswer(answers, "gaze_style", "steady_warm"),
    poseStyle: bodyPresence === "balanced_mature" ? "poised_shifted_weight" : "soft_forward_presence",
  };
}

function buildPersonalityProfile(answers: OnboardingAnswerInput[]): {
  temperament: string;
  affectionStyle: string;
  distanceStyle: string;
  initiativeStyle: string;
  expressionTone: string;
} {
  return {
    temperament: pickAnswer(answers, "temperament", "gentle_steady"),
    affectionStyle: pickAnswer(answers, "affection_style", "gentle_attentive"),
    distanceStyle: pickAnswer(answers, "distance_style", "poised"),
    initiativeStyle: pickAnswer(answers, "initiative_style", "measured_forward"),
    expressionTone: pickAnswer(answers, "expression_tone", "soft_direct"),
  };
}

function readPortraitImageUrl(profile: CompanionProfileRecord): string | null {
  try {
    const presentationSeed = JSON.parse(profile.presentationSeedJson) as { portraitImageUrl?: unknown };
    return typeof presentationSeed.portraitImageUrl === "string" ? presentationSeed.portraitImageUrl : null;
  } catch {
    return null;
  }
}

export function createOnboardingService(deps: Deps) {
  return {
    submitInitialAnswers(userId: string, submission: OnboardingSubmission) {
      const nowIso = new Date().toISOString();
      const { intake, userProfileAnswers, companionPreferenceAnswers } = submission;

      const { entryMode } = intake;

      // Persist all answers
      deps.onboardingAnswerStore.insertMany(userId, companionPreferenceAnswers, nowIso, "pref");
      deps.onboardingAnswerStore.insertMany(userId, userProfileAnswers, nowIso, "user");

      // Build profiles from companion preference answers
      const appearanceProfile = buildAppearanceProfile(companionPreferenceAnswers);
      const personalityProfile = buildPersonalityProfile(companionPreferenceAnswers);

      // Derive social/emotional context from user profile answers
      const socialEnergy = pickAnswer(userProfileAnswers, "social_energy", "slow_warm");
      const emotionalTexture = pickAnswer(userProfileAnswers, "emotional_texture", "sensitive_deep");
      const expressionStyle = pickAnswer(userProfileAnswers, "expression_style", "restrained");

      // Score initiative from the companion preference answers
      const initiativePref = pickAnswer(companionPreferenceAnswers, "initiative_style", "measured_forward");
      const initiativeScore = initiativePref === "measured_forward"
        ? 48
        : initiativePref === "quiet_steady"
          ? 32
          : initiativePref === "warm_open"
            ? 56
            : 44;

      // Build archetype string for persistence (backward compat)
      const archetype = `${personalityProfile.temperament}_${appearanceProfile.bodyPresence}`;

      const profile: CompanionProfileRecord = {
        userId,
        mode: entryMode === "fantasy" ? "fantasy" : "real",
        archetype,
        personalitySeedJson: JSON.stringify({ socialEnergy, emotionalTexture, expressionStyle, personalityProfile }),
        presentationSeedJson: JSON.stringify({ appearanceProfile, dreaminess: entryMode === "fantasy" ? 0.85 : 0.55 }),
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

      // Build the richer reveal
      const systemDisplayName = "她";

      const tagline =
        personalityProfile.temperament === "mature_steady"
          ? "她像夜色里慢慢靠近的人，安静，却不会让你觉得遥远。"
          : personalityProfile.affectionStyle === "gentle_attentive"
            ? "她先给你安静，再把温柔一点点放进相处里。"
            : "她不是吵闹的人，却会在合适的时候故意朝你笑一下。";

      const appearancePrompt = [
        "full body portrait",
        "japanese semi-realistic style",
        "dreamlike but grounded",
        "minimal ivory camisole bodysuit",
        "underwear-only styling, no outerwear",
        `hair: ${appearanceProfile.hairStyle}`,
        `presence: ${appearanceProfile.bodyPresence}`,
        `aura: ${appearanceProfile.fashionAura}`,
        appearanceProfile.gazeStyle ? `gaze: ${appearanceProfile.gazeStyle}` : "",
        entryMode === "fantasy" ? "misty atmosphere, cinematic glow" : "natural light, believable presence",
        "visible full figure",
      ].filter(Boolean).join(", ");

      const portraitDescription = "她给人的第一感觉并不锋利。她站着的时候很稳，像是先把自己的情绪收好，再把注意力轻轻落到你身上。她说话不会很急，可一旦真的看向你，目光里会有一种已经在认真分辨你的感觉。";

      const matchExplanation =
        socialEnergy === "slow_warm" && emotionalTexture === "sensitive_deep"
          ? "你偏好在安静中慢慢靠近，而她恰好是那种会先把自己的情绪收好、再把注意力轻轻落到你身上的人。她的稳重与你的内敛恰好契合。"
          : "你的回答勾勒出一种有温度、有分寸的相处方式，而她正是那种会先给你安全感、再慢慢把温度放进相处里的人。";

      const reveal: CompanionRevealV2 = {
        systemDisplayName,
        customName: null,
        tagline,
        appearancePrompt,
        portraitImageUrl: readPortraitImageUrl(profile),
        portraitDescription,
        matchExplanation,
        appearanceProfile,
        personalityProfile,
      };

      return { profile, relationship, reveal };
    },

    buildRevealFromProfile(profile: CompanionProfileRecord, relationship: RelationshipStateRecord): CompanionRevealV2 {
      const entryMode = profile.mode;
      try {
        const personalitySeed = JSON.parse(profile.personalitySeedJson) as {
          socialEnergy?: string;
          emotionalTexture?: string;
          expressionStyle?: string;
          personalityProfile?: {
            temperament: string;
            affectionStyle: string;
            distanceStyle: string;
            initiativeStyle: string;
            expressionTone: string;
          };
        };
        const presentationSeed = JSON.parse(profile.presentationSeedJson) as {
          customName?: string;
          appearanceProfile?: {
            hairStyle: string;
            bodyPresence: string;
            fashionAura: string;
            gazeStyle: string;
            poseStyle: string;
          };
        };
        const personalityProfile = personalitySeed.personalityProfile ?? {
          temperament: "gentle_steady",
          affectionStyle: "gentle_attentive",
          distanceStyle: "poised",
          initiativeStyle: "measured_forward",
          expressionTone: "soft_direct",
        };
        const appearanceProfile = presentationSeed.appearanceProfile ?? {
          hairStyle: "long_hair",
          bodyPresence: "balanced_mature",
          fashionAura: "stylish_refined",
          gazeStyle: "steady_warm",
          poseStyle: "poised_shifted_weight",
        };
        const systemDisplayName = "她";
        return {
          systemDisplayName,
          customName: presentationSeed.customName ?? null,
          tagline: "她像夜色里慢慢靠近的人，安静，却不会让你觉得遥远。",
          appearancePrompt: "full body portrait, japanese semi-realistic style, minimal ivory camisole bodysuit, underwear-only styling, no outerwear",
          portraitImageUrl: readPortraitImageUrl(profile),
          portraitDescription: "她给人的第一感觉并不锋利。",
          matchExplanation: "你们的气质在安静的默契中彼此呼应。",
          appearanceProfile,
          personalityProfile,
        };
      } catch {
        return {
          systemDisplayName: "她",
          customName: null,
          tagline: "她像夜色里慢慢靠近的人，安静，却不会让你觉得遥远。",
          appearancePrompt: "full body portrait, japanese semi-realistic style, minimal ivory camisole bodysuit, underwear-only styling, no outerwear",
          portraitImageUrl: readPortraitImageUrl(profile),
          portraitDescription: "她给人的第一感觉并不锋利。",
          matchExplanation: "你们的气质在安静的默契中彼此呼应。",
          appearanceProfile: {
            hairStyle: "long_hair",
            bodyPresence: "balanced_mature",
            fashionAura: "stylish_refined",
            gazeStyle: "steady_warm",
            poseStyle: "poised_shifted_weight",
          },
          personalityProfile: {
            temperament: "gentle_steady",
            affectionStyle: "gentle_attentive",
            distanceStyle: "poised",
            initiativeStyle: "measured_forward",
            expressionTone: "soft_direct",
          },
        };
      }
    },
  };
}
