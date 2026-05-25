export type CompanionMode = "real" | "fantasy" | "blended";
export type RelationshipStage = "initial" | "familiar" | "attuned" | "exclusive";
export type FeedbackKind =
  | "tone_preference"
  | "initiative_preference"
  | "recall_preference"
  | "boundary_preference"
  | "ootd_reaction";

export type CompanionProfileRecord = {
  userId: string;
  mode: CompanionMode;
  archetype: string;
  personalitySeedJson: string;
  presentationSeedJson: string;
  createdAt: string;
  updatedAt: string;
};

export type RelationshipStateRecord = {
  userId: string;
  stage: RelationshipStage;
  intimacyScore: number;
  initiativeScore: number;
  recallScore: number;
  boundaryFitScore: number;
  styleAlignmentScore: number;
  lastCalibratedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanionReveal = {
  displayName: string;
  tagline: string;
  appearancePrompt: string;
  portraitImageUrl: string | null;
  portraitDescription: string;
  matchExplanation: string;
};

export type OnboardingIntake = {
  entryMode: "real" | "fantasy";
};

export type StructuredOnboardingAnswer = {
  questionKey: string;
  answerValue: string;
  answerWeight?: number;
};

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

export type CompanionRevealV2 = {
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

// ---------------------------------------------------------------------------
// OOTD (Outfit of the Day) types
// ---------------------------------------------------------------------------

export type OotdRecord = {
  id: string;
  userId: string;
  date: string;
  imageUrl: string | null;
  title: string;
  caption: string | null;
  rationale: string | null;
  styleTags: string[];
  cards?: OotdCard[] | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// OOTD Card types
// ---------------------------------------------------------------------------

export type OotdCardKind = "fullbody_selfie" | "makeup_closeup";

export type OotdCard = {
  id: string;
  kind: OotdCardKind;
  imageUrl: string | null;
  caption: string | null;
  poseTag?: "cute" | "sexy" | "elegant";
  liked?: boolean;
};