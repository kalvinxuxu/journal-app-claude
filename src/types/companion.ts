export type FrontendRelationshipStage = "initial" | "familiar" | "attuned" | "exclusive";

export type CompanionRevealSummary = {
  displayName: string;
  tagline: string;
  appearancePrompt: string;
  portraitImageUrl: string | null;
  portraitDescription: string;
  matchExplanation: string;
};

export type InitialCompanionResult = {
  profile: { archetype: string; mode: "real" | "fantasy" };
  relationship: { stage: FrontendRelationshipStage; initiativeScore: number };
  reveal: CompanionRevealSummary;
};
