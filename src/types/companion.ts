export type FrontendRelationshipStage = "initial" | "familiar" | "attuned" | "exclusive";

export type InitialCompanionResult = {
  profile: {
    archetype: string;
    mode: "real" | "fantasy";
  };
  relationship: {
    stage: FrontendRelationshipStage;
    initiativeScore: number;
  };
};
