import { Router } from "express";
import path from "path";
import type Database from "better-sqlite3";
import { createAppDatabase } from "../../db/database.js";
import { createCompanionProfileStore } from "../store/companionProfileStore.js";
import { createRelationshipStateStore } from "../store/relationshipStateStore.js";
import { createOnboardingAnswerStore } from "../store/onboardingAnswerStore.js";
import { createOnboardingService } from "../services/onboardingService.js";
import { createFeedbackStore } from "../store/feedbackStore.js";
import { createUnlockEventStore } from "../store/unlockEventStore.js";
import { createOotdStore } from "../store/ootdStore.js";
import { createOotdGenerator } from "../services/ootdService.js";
import { createMemoryItemStore } from "../store/memoryItemStore.js";
import { createJournalContextBuilder } from "../services/journalContextBuilder.js";
import { createJournalPromptContextService } from "../services/journalPromptContextService.js";
import type { Journal } from "../../storage/journalStore.js";
import { loadJournals, saveJournal, deleteJournalByDate } from "../../storage/journalStore.js";
import { createTaskRepository } from "../../generation/taskRepository.js";
import { createGenerationTaskService } from "../../generation/taskService.js";

type JournalPostProcessor = {
  process: (input: {
    userId: string;
    journalId: string;
    content: string;
    previousRelationship: {
      userId: string;
      stage: string;
      intimacyScore: number;
      initiativeScore: number;
      recallScore: number;
      boundaryFitScore: number;
      styleAlignmentScore: number;
      lastCalibratedAt: string | null;
      createdAt: string;
      updatedAt: string;
    };
    journalCount: number;
    feedbackCount: number;
    ootdLikeCount?: number;
  }) => void;
};

export function createCompanionRoutes(
  db?: Database.Database,
  deps?: {
    journalPostProcessor?: JournalPostProcessor;
    getJournalCount?: (userId: string) => Promise<number>;
  },
) {
  const database = db ?? createAppDatabase();
  const router = Router();
  const onboardingService = createOnboardingService({
    onboardingAnswerStore: createOnboardingAnswerStore(database),
    companionProfileStore: createCompanionProfileStore(database),
    relationshipStateStore: createRelationshipStateStore(database),
  });
  const profileStore = createCompanionProfileStore(database);
  const feedbackStore = createFeedbackStore(database);
  const unlockEventStore = createUnlockEventStore(database);
  const relationshipStateStore = createRelationshipStateStore(database);

  router.post("/onboarding/initialize", (req, res) => {
    const { userId, intake, userProfileAnswers, companionPreferenceAnswers } = req.body as {
      userId?: string;
      intake?: { entryMode?: "real" | "fantasy" };
      userProfileAnswers?: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
      companionPreferenceAnswers?: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
    };

    if (!userId || !intake || !userProfileAnswers || userProfileAnswers.length < 3 || !companionPreferenceAnswers || companionPreferenceAnswers.length < 7) {
      res.status(400).json({ error: "userId, intake, 3 userProfileAnswers, and 7 companionPreferenceAnswers are required" });
      return;
    }

    // Ensure user exists in the users table (FK dependency for companion tables)
    const insertUser = database.prepare(`
      INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    const now = new Date().toISOString();
    insertUser.run(userId, now, now);

    const result = onboardingService.submitInitialAnswers(userId, {
      intake: { entryMode: intake.entryMode === "fantasy" ? "fantasy" : "real" },
      userProfileAnswers,
      companionPreferenceAnswers,
    });
    res.status(201).json(result);
  });

  router.post("/onboarding/name", (req, res) => {
    const { userId, customName } = req.body as { userId?: string; customName?: string };
    if (!userId || !customName?.trim()) {
      res.status(400).json({ error: "userId and customName are required" });
      return;
    }

    const updated = profileStore.updateCustomName(userId, customName.trim(), new Date().toISOString());
    if (!updated) {
      res.status(404).json({ error: "Companion profile not found" });
      return;
    }

    res.json({ ok: true });
  });

  router.get("/onboarding/status/:userId", (req, res) => {
    const relationshipStore = createRelationshipStateStore(database);
    const profile = profileStore.findByUserId(req.params.userId);
    const relationship = relationshipStore.findByUserId(req.params.userId);

    if (!profile || !relationship) {
      res.json({ completed: false, archetype: null, reveal: null });
      return;
    }

    const reveal = onboardingService.buildRevealFromProfile(profile, relationship);
    res.json({ completed: true, archetype: profile.archetype, reveal });
  });

  router.post("/onboarding/portrait", (req, res) => {
    const { userId, portraitImageUrl } = req.body as {
      userId?: string;
      portraitImageUrl?: string;
    };

    if (!userId || !portraitImageUrl) {
      res.status(400).json({ error: "userId and portraitImageUrl are required" });
      return;
    }

    const updated = profileStore.updatePortraitImageUrl(
      userId,
      portraitImageUrl,
      new Date().toISOString(),
    );

    if (!updated) {
      res.status(404).json({ error: "Companion profile not found" });
      return;
    }

    res.json({ ok: true });
  });

  router.post("/feedback", async (req, res) => {
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

    // Ensure user exists in the users table (FK dependency)
    const insertUser = database.prepare(`
      INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    insertUser.run(userId, new Date().toISOString(), new Date().toISOString());

    feedbackStore.insert({
      id: `fb_${Date.now()}`,
      userId,
      journalId: journalId ?? null,
      feedbackKind: feedbackKind as never,
      feedbackValue,
      createdAt: new Date().toISOString(),
    });

    // Trigger relationship progression for OOTD reactions
    if (feedbackKind === "ootd_reaction" && deps?.journalPostProcessor) {
      const previousRelationship = relationshipStateStore.findByUserId(userId);
      if (previousRelationship) {
        const journalCount = (await deps?.getJournalCount?.(userId)) ?? 0;
        const ootdLikeCount = feedbackStore.countOotdReactionsByUserId(userId);
        deps.journalPostProcessor.process({
          userId,
          journalId: journalId ?? "",
          content: "",
          previousRelationship,
          journalCount,
          feedbackCount: 0,
          ootdLikeCount,
        });
      }
    }

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
    const contextBuilder = createJournalContextBuilder();
    const promptService = createJournalPromptContextService();

    const { recalledMemory, echoCandidates } = contextBuilder.build(memories);
    const promptContext = promptService.build({
      relationshipStage: relationship.stage,
      recalledMemory,
      initiativeScore: relationship.initiativeScore,
    });

    res.json({
      relationshipStage: relationship.stage,
      recalledMemory,
      initiativeScore: relationship.initiativeScore,
      initiativeTone: promptContext.initiativeTone,
    });
  });

  // ---------------------------------------------------------------------------
  // Daily journal generation endpoint
  // Generates or regenerates a daily journal for the specified date.
  // Uses the task system for draft generation (same path as App.tsx auto-gen
  // and DiaryWallPage manual refresh), ensuring a single journal per day.
  // ---------------------------------------------------------------------------

  // GET /api/companion/daily-journal/check/:date — check if today's journal exists
  router.get("/daily-journal/check/:date", async (req, res) => {
    const userId = req.query.userId as string | undefined;
    const date = req.params.date;

    try {
      const allJournals = await loadJournals();
      const existing = allJournals.find(
        (j) => j.date === date && !isDailySummary(j),
      );
      res.json({
        exists: Boolean(existing),
        journalId: existing?.id ?? null,
      });
    } catch (error) {
      console.error("Failed to check daily journal:", error);
      res.status(500).json({ error: "Failed to check journal existence" });
    }
  });

  // POST /api/companion/daily-journal/generate — generate (or regenerate) today's journal
  // Handles overwrite: removes any existing entry for the same date first.
  router.post("/daily-journal/generate", async (req, res) => {
    const {
      userId,
      date,
      mood,
      voiceStyle,
      sceneHint,
      recalledMemory,
    } = req.body as {
      userId?: string;
      date?: string;
      mood?: "开心" | "想念" | "感动" | "平静" | "调皮";
      voiceStyle?: "soft" | "warm" | "playful";
      sceneHint?: string;
      recalledMemory?: string;
    };

    if (!userId || !date || !mood) {
      res.status(400).json({ error: "userId, date, and mood are required" });
      return;
    }

    // Ensure user exists
    const insertUser = database.prepare(`
      INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    insertUser.run(userId, new Date().toISOString(), new Date().toISOString());

    try {
      // Remove existing entry for this date (overwrite semantics)
      await deleteJournalByDate(date);

      // Use the generation task system (same pipeline as auto-gen and manual refresh)
      const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd());
      const taskRepository = createTaskRepository(
        process.env.GENERATION_TASK_DB_PATH ?? path.join(DATA_DIR, "generation-tasks.db"),
      );
      const taskService = createGenerationTaskService(taskRepository);

      const created = await taskService.createTask({
        type: "draft_generation",
        input: {
          mood,
          date,
          voiceStyle,
          sceneHint,
          recalledMemory,
        },
        priority: 5,
      });

      // Poll for completion (synchronous for now; caller can also poll via GET /api/generation/tasks/:id)
      let task = await taskService.getTask(created.task.id);
      const maxAttempts = 60; // ~60s timeout
      let attempts = 0;
      while (
        task &&
        (task.status === "queued" ||
        task.status === "leased" ||
        task.status === "running")
      ) {
        if (attempts >= maxAttempts) {
          res.status(504).json({ error: "Journal generation timed out" });
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
        task = await taskService.getTask(created.task.id);
        attempts++;
      }

      if (!task || task.status !== "succeeded" || !task.output) {
        res.status(500).json({
          error: "Journal generation failed",
          detail: task?.error?.message ?? "Unknown error",
        });
        return;
      }

      const output = task.output as {
        journalContent: string;
        voiceScripts: Array<{ timing: string; transcript: string; duration: string }>;
      };

      const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
        new Date(`${date}T12:00:00`).getDay()
      ];

      const newJournal: Journal = {
        id: `journal-${date}`,
        date,
        weekday,
        mood,
        source: "girlfriend",
        content: output.journalContent,
        voiceMessages: output.voiceScripts.map((v) => ({
          id: `voice-${v.timing}`,
          timing: v.timing as "morning" | "afternoon" | "night",
          transcript: v.transcript,
          duration: v.duration,
        })),
        voiceStyle,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveJournal(newJournal);
      res.status(201).json({ journal: newJournal });
    } catch (error) {
      console.error("Daily journal generation error:", error);
      res.status(500).json({
        error: "Failed to generate daily journal",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  function isDailySummary(journal: Journal): boolean {
    return Boolean(journal.isDailySummary);
  }

  function getPortraitReference(userId: string) {
    const profile = profileStore.findByUserId(userId);
    if (!profile) return undefined;

    try {
      const presentationSeed = JSON.parse(profile.presentationSeedJson) as {
        portraitImageUrl?: string;
      };
      return presentationSeed.portraitImageUrl;
    } catch {
      return undefined;
    }
  }

  function getFashionAura(userId: string) {
    const profile = profileStore.findByUserId(userId);
    if (!profile) return undefined;

    try {
      const presentationSeed = JSON.parse(profile.presentationSeedJson) as {
        appearanceProfile?: { fashionAura?: string };
      };
      return presentationSeed.appearanceProfile?.fashionAura;
    } catch {
      return undefined;
    }
  }

  const ootdStore = createOotdStore(database);
  const ootdGenerator = createOotdGenerator({
    port: Number(process.env.PORT ?? 3000),
    generateImage: async ({ prompt, aspectRatio, subjectReference }) => {
      try {
        const response = await fetch(`http://localhost:${process.env.PORT ?? 3000}/api/image-generation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            aspect_ratio: aspectRatio,
            n: 1,
            ...(subjectReference
              ? {
                  subject_reference: [
                    {
                      type: "character",
                      image_file: subjectReference,
                    },
                  ],
                }
              : {}),
          }),
        });
        const data = await response.json() as { data?: { image_urls?: string[] }; error?: string };
        if (data.data?.image_urls?.[0]) {
          return data.data.image_urls[0];
        }
        return null;
      } catch {
        return null;
      }
    },
  });

  // GET /api/companion/ootd/:date
  // Auto-generates OOTD for today if none exists (self-initiated feel)
  router.get("/ootd/:date", async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    let ootd = ootdStore.findByUserIdAndDate(userId, req.params.date);

    // Auto-generate if no OOTD exists for this date (she picked something today)
    if (!ootd) {
      const result = await ootdGenerator(
        userId,
        req.params.date,
        getPortraitReference(userId),
        getFashionAura(userId),
      );
      const now = new Date().toISOString();
      const ootdRecord = {
        id: `ootd_${Date.now()}`,
        userId,
        date: req.params.date,
        imageUrl: result.cards[0]?.imageUrl ?? null,
        title: result.title,
        caption: result.cards[0]?.caption ?? result.caption,
        rationale: result.rationale,
        styleTags: result.styleTags,
        cards: result.cards,
        createdAt: now,
        updatedAt: now,
      };
      ootdStore.upsert(ootdRecord);
      ootd = ootdRecord;
    }

    res.json({ ootd });
  });

  // POST /api/companion/ootd/regenerate
  router.post("/ootd/regenerate", async (req, res) => {
    const { userId, date, style } = req.body as {
      userId?: string;
      date?: string;
      style?: "old_money" | "relaxed_minimal" | "y2k_playful" | "sweet_girly";
    };
    if (!userId || !date) {
      res.status(400).json({ error: "userId and date are required" });
      return;
    }

    // Ensure user exists
    const insertUser = database.prepare(`
      INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    insertUser.run(userId, new Date().toISOString(), new Date().toISOString());

    const result = await ootdGenerator(
      userId,
      date,
      getPortraitReference(userId),
      style ?? getFashionAura(userId),
    );
    const now = new Date().toISOString();
    const ootdRecord = {
      id: `ootd_${Date.now()}`,
      userId,
      date,
      imageUrl: result.cards[0]?.imageUrl ?? null,
      title: result.title,
      caption: result.cards[0]?.caption ?? result.caption,
      rationale: result.rationale,
      styleTags: result.styleTags,
      cards: result.cards,
      createdAt: now,
      updatedAt: now,
    };

    ootdStore.upsert(ootdRecord);
    res.status(201).json({ ootd: ootdRecord });
  });

  return router;
}
