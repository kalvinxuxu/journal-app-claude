export type FrontendRelationshipStage = "initial" | "familiar" | "attuned" | "exclusive";

export type CompanionAppearanceProfile = {
  hairStyle: string;
  bodyPresence: string;
  fashionAura: string;
  gazeStyle: string;
  poseStyle: string;
};

export type CompanionPersonalityProfile = {
  temperament: string;
  affectionStyle: string;
  distanceStyle: string;
  initiativeStyle: string;
  expressionTone: string;
};

export type CompanionRevealSummary = {
  systemDisplayName: string;
  customName: string | null;
  tagline: string;
  appearancePrompt: string;
  portraitImageUrl: string | null;
  portraitDescription: string;
  matchExplanation: string;
  appearanceProfile: CompanionAppearanceProfile;
  personalityProfile: CompanionPersonalityProfile;
};

export type InitialCompanionResult = {
  profile: { archetype: string; mode: "real" | "fantasy" };
  relationship: { stage: FrontendRelationshipStage; initiativeScore: number };
  reveal: CompanionRevealSummary;
};