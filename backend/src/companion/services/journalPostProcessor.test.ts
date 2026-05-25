import { describe, expect, it, vi } from "vitest";
import { createJournalPostProcessor } from "./journalPostProcessor";

describe("createJournalPostProcessor", () => {
  it("extracts memories, advances relationship state, and emits unlocks after a journal save", () => {
    const insertMemory = vi.fn();
    const saveRelationship = vi.fn();
    const saveUnlock = vi.fn();

    const processor = createJournalPostProcessor({
      extractMemories: () => [
        {
          summary: "害怕被别人觉得麻烦",
          memoryType: "fear",
          salienceScore: 95,
          recallScore: 90,
          isStructured: 1,
          detailJson: "{}",
        },
      ],
      advanceRelationship: (input) => ({
        userId: "usr_1",
        stage: input.ootdLikeCount ? "familiar" : "familiar",
        intimacyScore: 45 + (input.ootdLikeCount ?? 0),
        initiativeScore: 40,
        recallScore: 24,
        boundaryFitScore: 50,
        styleAlignmentScore: 40 + (input.ootdLikeCount ?? 0) * 4,
        lastCalibratedAt: null,
        createdAt: "2026-05-22T00:00:00.000Z",
        updatedAt: "2026-05-22T00:01:00.000Z",
      }),
      evaluateUnlocks: () => [{ eventKey: "stage-familiar", eventSummary: "她开始更自然地靠近你了。" }],
      insertMemory,
      saveRelationship,
      saveUnlock,
    });

    processor.process({
      userId: "usr_1",
      journalId: "jr_1",
      content: "我其实很怕别人觉得我麻烦。",
      previousRelationship: {
        userId: "usr_1",
        stage: "initial",
        intimacyScore: 35,
        initiativeScore: 35,
        recallScore: 20,
        boundaryFitScore: 50,
        styleAlignmentScore: 40,
        lastCalibratedAt: null,
        createdAt: "2026-05-22T00:00:00.000Z",
        updatedAt: "2026-05-22T00:00:00.000Z",
      },
      journalCount: 10,
      feedbackCount: 2,
    });

    expect(insertMemory).toHaveBeenCalledTimes(1);
    expect(saveRelationship).toHaveBeenCalledTimes(1);
    expect(saveUnlock).toHaveBeenCalledTimes(1);
  });

  it("passes ootdLikeCount through to advanceRelationship", () => {
    const advanceRelationship = vi.fn(() => ({
      userId: "usr_1",
      stage: "familiar" as const,
      intimacyScore: 46,
      initiativeScore: 40,
      recallScore: 24,
      boundaryFitScore: 50,
      styleAlignmentScore: 44,
      lastCalibratedAt: null,
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:01:00.000Z",
    }));
    const insertMemory = vi.fn();
    const saveRelationship = vi.fn();
    const saveUnlock = vi.fn();

    const processor = createJournalPostProcessor({
      extractMemories: () => [],
      advanceRelationship,
      evaluateUnlocks: () => [],
      insertMemory,
      saveRelationship,
      saveUnlock,
    });

    processor.process({
      userId: "usr_1",
      journalId: "jr_1",
      content: "test",
      previousRelationship: {
        userId: "usr_1",
        stage: "initial",
        intimacyScore: 35,
        initiativeScore: 35,
        recallScore: 20,
        boundaryFitScore: 50,
        styleAlignmentScore: 40,
        lastCalibratedAt: null,
        createdAt: "2026-05-22T00:00:00.000Z",
        updatedAt: "2026-05-22T00:00:00.000Z",
      },
      journalCount: 0,
      feedbackCount: 0,
      ootdLikeCount: 2,
    });

    expect(advanceRelationship).toHaveBeenCalledWith(
      expect.objectContaining({ ootdLikeCount: 2 }),
    );
  });
});