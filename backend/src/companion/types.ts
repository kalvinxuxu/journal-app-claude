export type CompanionMode = "real" | "fantasy" | "blended";
export type RelationshipStage = "initial" | "familiar" | "attuned" | "exclusive";
export type FeedbackKind =
  | "tone_preference"
  | "initiative_preference"
  | "recall_preference"
  | "boundary_preference";

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