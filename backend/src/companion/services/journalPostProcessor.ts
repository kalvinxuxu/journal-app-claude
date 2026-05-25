import { randomUUID } from "node:crypto";
import type { RelationshipStateRecord } from "../types";

type Deps = {
  extractMemories: (input: { userId: string; journalId: string; content: string }) => Array<{
    summary: string;
    memoryType: string;
    salienceScore: number;
    recallScore: number;
    isStructured: 0 | 1;
    detailJson: string;
  }>;
  advanceRelationship: (input: {
    previous: RelationshipStateRecord;
    journalCount: number;
    deepMemoryCount: number;
    feedbackCount: number;
    ootdLikeCount?: number;
  }) => RelationshipStateRecord;
  evaluateUnlocks: (previous: RelationshipStateRecord, next: RelationshipStateRecord) => Array<{
    eventKey: string;
    eventSummary: string;
  }>;
  insertMemory: (record: {
    id: string;
    userId: string;
    journalId: string;
    memoryType: string;
    summary: string;
    detailJson: string;
    salienceScore: number;
    recallScore: number;
    isStructured: 0 | 1;
    createdAt: string;
    updatedAt: string;
  }) => void;
  saveRelationship: (record: RelationshipStateRecord) => void;
  saveUnlock: (record: {
    id: string;
    userId: string;
    eventKey: string;
    eventSummary: string;
    surfacedAt: string | null;
    createdAt: string;
  }) => void;
};

export function createJournalPostProcessor(deps: Deps) {
  return {
    process(input: {
      userId: string;
      journalId: string;
      content: string;
      previousRelationship: RelationshipStateRecord;
      journalCount: number;
      feedbackCount: number;
      ootdLikeCount?: number;
    }) {
      const nowIso = new Date().toISOString();
      const memories = deps.extractMemories({
        userId: input.userId,
        journalId: input.journalId,
        content: input.content,
      });

      for (const memory of memories) {
        deps.insertMemory({
          id: randomUUID(),
          userId: input.userId,
          journalId: input.journalId,
          memoryType: memory.memoryType,
          summary: memory.summary,
          detailJson: memory.detailJson,
          salienceScore: memory.salienceScore,
          recallScore: memory.recallScore,
          isStructured: memory.isStructured,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      const nextRelationship = deps.advanceRelationship({
        previous: input.previousRelationship,
        journalCount: input.journalCount,
        deepMemoryCount: memories.filter((item) => item.salienceScore >= 85).length,
        feedbackCount: input.feedbackCount,
        ootdLikeCount: input.ootdLikeCount,
      });

      deps.saveRelationship(nextRelationship);

      for (const unlock of deps.evaluateUnlocks(input.previousRelationship, nextRelationship)) {
        deps.saveUnlock({
          id: randomUUID(),
          userId: input.userId,
          eventKey: unlock.eventKey,
          eventSummary: unlock.eventSummary,
          surfacedAt: null,
          createdAt: nowIso,
        });
      }
    },
  };
}