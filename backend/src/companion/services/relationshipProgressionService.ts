import type { RelationshipStateRecord } from "../types";

type ProgressInput = {
  previous: RelationshipStateRecord;
  journalCount: number;
  deepMemoryCount: number;
  feedbackCount: number;
};

export function createRelationshipProgressionService() {
  return {
    advance(input: ProgressInput): RelationshipStateRecord {
      const next = { ...input.previous };
      next.intimacyScore += input.deepMemoryCount > 0 ? 6 : 2;
      next.initiativeScore += input.journalCount >= 10 ? 5 : 0;
      next.recallScore += input.deepMemoryCount > 0 ? 4 : 1;
      next.styleAlignmentScore += input.feedbackCount > 0 ? 3 : 0;

      if (next.intimacyScore >= 40) next.stage = "familiar";
      if (next.intimacyScore >= 70) next.stage = "attuned";
      if (next.intimacyScore >= 90) next.stage = "exclusive";

      next.updatedAt = new Date().toISOString();
      return next;
    },
  };
}