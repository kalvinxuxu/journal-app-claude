import { describe, expect, it } from "vitest";
import { createRelationshipProgressionService } from "./relationshipProgressionService";

describe("createRelationshipProgressionService", () => {
  describe("advance", () => {
    const previous = {
      userId: "usr_1",
      stage: "initial" as const,
      intimacyScore: 30,
      initiativeScore: 30,
      recallScore: 20,
      boundaryFitScore: 50,
      styleAlignmentScore: 30,
      lastCalibratedAt: null,
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
    };

    it("adds base intimacy when no deep memories", () => {
      const service = createRelationshipProgressionService();
      const next = service.advance({
        previous,
        journalCount: 0,
        deepMemoryCount: 0,
        feedbackCount: 0,
      });

      expect(next.intimacyScore).toBe(32); // +2 base
    });

    it("adds extra intimacy when deep memories exist", () => {
      const service = createRelationshipProgressionService();
      const next = service.advance({
        previous,
        journalCount: 0,
        deepMemoryCount: 1,
        feedbackCount: 0,
      });

      expect(next.intimacyScore).toBe(36); // +6 with deep memory
    });

    it("adds initiative when journal count >= 10", () => {
      const service = createRelationshipProgressionService();
      const next = service.advance({
        previous,
        journalCount: 10,
        deepMemoryCount: 0,
        feedbackCount: 0,
      });

      expect(next.initiativeScore).toBe(35); // +5
    });

    it("adds style-alignment gain when feedback exists", () => {
      const service = createRelationshipProgressionService();
      const next = service.advance({
        previous,
        journalCount: 0,
        deepMemoryCount: 0,
        feedbackCount: 1,
      });

      expect(next.styleAlignmentScore).toBe(33); // +3
    });

    it("adds a small style-alignment gain when ootd likes exist", () => {
      const service = createRelationshipProgressionService();
      const next = service.advance({
        previous,
        journalCount: 0,
        deepMemoryCount: 0,
        feedbackCount: 0,
        ootdLikeCount: 2,
      });

      expect(next.styleAlignmentScore).toBe(previous.styleAlignmentScore + 4);
    });
  });
});