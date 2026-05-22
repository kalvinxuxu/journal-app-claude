export function createJournalPromptContextService() {
  return {
    build(input: {
      relationshipStage: string;
      recalledMemory: string;
      initiativeScore: number;
    }) {
      return {
        relationshipStage: input.relationshipStage,
        recalledMemory: input.recalledMemory,
        initiativeTone:
          input.initiativeScore >= 50
            ? "主动靠近"
            : input.initiativeScore >= 35
              ? "自然靠近"
              : "克制靠近",
      };
    },
  };
}