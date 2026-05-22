import { Router } from "express";
import type Database from "better-sqlite3";
import { createAppDatabase } from "../../db/database";
import { createCompanionProfileStore } from "../store/companionProfileStore";
import { createRelationshipStateStore } from "../store/relationshipStateStore";
import { createOnboardingAnswerStore } from "../store/onboardingAnswerStore";
import { createOnboardingService } from "../services/onboardingService";
import { createFeedbackStore } from "../store/feedbackStore";
import { createUnlockEventStore } from "../store/unlockEventStore";
import { createMemoryItemStore } from "../store/memoryItemStore";
import { createMemoryRecallService } from "../services/memoryRecallService";

export function createCompanionRoutes(db?: Database.Database) {
  const database = db ?? createAppDatabase();
  const router = Router();
  const onboardingService = createOnboardingService({
    onboardingAnswerStore: createOnboardingAnswerStore(database),
    companionProfileStore: createCompanionProfileStore(database),
    relationshipStateStore: createRelationshipStateStore(database),
  });
  const feedbackStore = createFeedbackStore(database);
  const unlockEventStore = createUnlockEventStore(database);

  router.post("/onboarding/initialize", (req, res) => {
    const { userId, answers } = req.body as {
      userId?: string;
      answers?: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
    };

    if (!userId || !answers || answers.length < 3) {
      res.status(400).json({ error: "userId and at least 3 answers are required" });
      return;
    }

    const result = onboardingService.submitInitialAnswers(userId, answers);
    res.status(201).json(result);
  });

  router.post("/feedback", (req, res) => {
    const { userId, journalId, feedbackKind, feedbackValue } = req.body as {
      userId?: string;
      journalId?: string;
      feedbackKind?: string;
      feedbackValue?: string;
    };

    if (!userId || !feedbackKind || !feedbackValue) {
      res.status(400).json({ error: "userId, feedbackKind, and feedbackValue are required" });
      return;
    }

    feedbackStore.insert({
      id: `fb_${Date.now()}`,
      userId,
      journalId: journalId ?? null,
      feedbackKind: feedbackKind as never,
      feedbackValue,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ ok: true });
  });

  router.get("/unlocks/:userId", (req, res) => {
    const rows = unlockEventStore.listUnsurfaced(req.params.userId);
    const surfacedAt = new Date().toISOString();

    for (const row of rows) {
      unlockEventStore.markSurfaced(row.id, surfacedAt);
    }

    res.json({ unlocks: rows });
  });

  router.get("/context/:userId", (req, res) => {
    const relationshipStore = createRelationshipStateStore(database);
    const memoryItemStore = createMemoryItemStore(database);

    const relationship = relationshipStore.findByUserId(req.params.userId);
    if (!relationship) {
      res.status(404).json({ error: "No companion context found" });
      return;
    }

    const memories = memoryItemStore.listByUserId(req.params.userId);
    const recallService = createMemoryRecallService();
    const selected = recallService.selectForJournal(memories, 3);

    res.json({
      relationshipStage: relationship.stage,
      recalledMemory: selected.map((m) => m.summary).join("；"),
      initiativeScore: relationship.initiativeScore,
    });
  });

  return router;
}