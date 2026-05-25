import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// ---------------------------------------------------------------------------
// App database with companion domain schema bootstrap
// ---------------------------------------------------------------------------
import { createAppDatabase } from "./db/database.js";
import { ensureAppSchema } from "./db/schema.js";

const appDb = createAppDatabase();
ensureAppSchema(appDb);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

// ---------------------------------------------------------------------------
// MiniMax config (image + TTS)
// ---------------------------------------------------------------------------
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";

// ---------------------------------------------------------------------------
// Z-Image config (image generation - Alibaba Wanxiang)
// ---------------------------------------------------------------------------
const ZIMAGE_API_KEY = process.env.ZIMAGE_API_KEY;
const ZIMAGE_BASE_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (corsOrigins.length === 0) {
      callback(NODE_ENV === "production" ? new Error("CORS_ORIGIN is not configured") : null, NODE_ENV !== "production");
      return;
    }

    if (corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MiniMaxError {
  status_code: number;
  status_msg: string;
}

type Mood = "开心" | "想念" | "感动" | "平静" | "调皮";

type VoiceTiming = "morning" | "afternoon" | "night";

type ContentGenerationInput = {
  mood: Mood;
  date: string;
  recalledMemory?: string;
  voiceStyle?: "soft" | "warm" | "playful";
  sceneHint?: string;
};

type ContentGenerationOutput = {
  journalContent: string;
  voiceScripts: Array<{
    timing: VoiceTiming;
    transcript: string;
    duration: string;
  }>;
  error?: string;
};

// ---------------------------------------------------------------------------
// MiniMax proxy (image + TTS only)
// ---------------------------------------------------------------------------

function miniMaxApiError(error: unknown): error is MiniMaxError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status_code" in error &&
    "status_msg" in error
  );
}

async function proxyToMiniMax<T>(endpoint: string, body: object): Promise<T> {
  const url = `${MINIMAX_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${MINIMAX_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (MINIMAX_GROUP_ID) {
    headers["GroupId"] = MINIMAX_GROUP_ID;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let data: unknown;
  const rawText = await response.text();

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`MiniMax API returned non-JSON (HTTP ${response.status}): ${rawText.substring(0, 200)}`);
  }

  if (!response.ok) {
    const errorMsg = miniMaxApiError(data) ? (data as MiniMaxError).status_msg : `HTTP ${response.status}`;
    throw new Error(`MiniMax API error: ${errorMsg}`);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Z-Image proxy (image generation - Alibaba Wanxiang)
// ---------------------------------------------------------------------------

// Custom error class to preserve structured upstream response
class UpstreamAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "UpstreamAPIError";
  }
}

async function proxyToZImage(body: object): Promise<unknown> {
  const response = await fetch(ZIMAGE_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ZIMAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new UpstreamAPIError(
      `Z-Image API error: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      data,
    );
  }

  return data;
}

// ---------------------------------------------------------------------------
// Content generation — uses provider abstraction
// ---------------------------------------------------------------------------
// biome-ignore lint: backend only, provider pattern
const CONTENT_PROVIDER = process.env.CONTENT_PROVIDER ?? "deepseek";

async function getContentProvider() {
  if (CONTENT_PROVIDER === "deepseek") {
    const { createDeepSeekContentProvider } = await import("./providers/deepseekContentProvider.js");
    return createDeepSeekContentProvider();
  }
  // Default to DeepSeek (current stable provider)
  const { createDeepSeekContentProvider } = await import("./providers/deepseekContentProvider.js");
  return createDeepSeekContentProvider();
}

app.post("/api/content-generation", async (req: Request, res: Response) => {
  try {
    const input: ContentGenerationInput = req.body;

    if (!input.mood || !input.date) {
      res.status(400).json({ error: "mood and date are required" });
      return;
    }

    const provider = await getContentProvider();
    const result = await provider.generate({
      mood: input.mood,
      date: input.date,
      recalledMemory: input.recalledMemory,
      voiceStyle: input.voiceStyle,
      sceneHint: input.sceneHint,
    });

    const output: ContentGenerationOutput = {
      journalContent: result.journalContent,
      voiceScripts: result.voiceScripts,
    };

    res.json(output);
  } catch (error) {
    console.error("Content generation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Content generation failed",
    });
  }
});

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

app.post("/api/image-generation", async (req: Request, res: Response) => {
  const reqBody: Record<string, unknown> = req.body;
  const imgPrompt = reqBody.prompt as string | undefined;
  const imgAspectRatio = reqBody.aspect_ratio as string | undefined;
  const imgN = reqBody.n as number | undefined;
  const imgSubjectRef = reqBody.subject_reference as Array<{ type: string; image_file: string }> | undefined;

  // ---------------------------------------------------------------------------
  // Try Z-Image first, fall back to MiniMax on failure
  // ---------------------------------------------------------------------------
  try {
    const sizeMap: Record<string, string> = {
      "16:9": "1024*576",
      "1:1": "1024*1024",
      "4:3": "1024*768",
      "9:16": "768*1024",
    };
    const size = imgAspectRatio ? (sizeMap[imgAspectRatio] ?? "1024*1024") : "1024*1024";

    const requestBody: Record<string, unknown> = {
      model: "z-image-turbo",
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: imgPrompt }],
          },
        ],
      },
      parameters: {
        prompt_extend: false,
        size,
        n: imgN || 1,
      },
    };

    if (imgSubjectRef && imgSubjectRef.length > 0) {
      const ref = imgSubjectRef[0];
      if (ref.type === "character" && ref.image_file) {
        const params = requestBody.parameters as Record<string, unknown>;
        requestBody.parameters = {
          ...params,
          subject_reference: {
            type: "character",
            image_file: ref.image_file,
          },
        };
      }
    }

    const result = await proxyToZImage(requestBody) as {
      output?: {
        choices?: Array<{
          message?: {
            content?: Array<{ image?: string; text?: string }>;
          };
        }>;
      };
    };

    const imageUrls = result.output?.choices?.[0]?.message?.content
      ?.filter((c) => c.image)
      .map((c) => c.image) || [];

    res.json({
      data: {
        image_urls: imageUrls,
      },
    });
  } catch (primaryError) {
    // Z-Image failed — try MiniMax as fallback
    console.warn(`Z-Image failed (${primaryError instanceof Error ? primaryError.message : String(primaryError)}), trying MiniMax...`);

    try {
      const miniMaxSizeMap: Record<string, string> = {
        "16:9": "16:9",
        "1:1": "1:1",
        "4:3": "4:3",
        "9:16": "9:16",
      };
      const miniMaxSize = imgAspectRatio ? (miniMaxSizeMap[imgAspectRatio] ?? "1:1") : "1:1";

      const miniMaxRequestBody = {
        model: "image-01",
        prompt: imgPrompt,
        aspect_ratio: miniMaxSize,
        response_format: "base64",
        n: imgN || 1,
      };

      const miniMaxResult = await proxyToMiniMax<{
        data?: { image_base64?: string[]; image_urls?: string[] };
        base_resp?: { status_code: number; status_msg: string };
      }>("/image_generation", miniMaxRequestBody);

      let imageUrls: string[] = [];

      if (miniMaxResult.data?.image_base64) {
        // Convert base64 to data URLs for frontend compatibility
        imageUrls = miniMaxResult.data.image_base64.map(b64 => `data:image/jpeg;base64,${b64}`);
      } else if (miniMaxResult.data?.image_urls) {
        imageUrls = miniMaxResult.data.image_urls;
      }

      res.json({
        data: {
          image_urls: imageUrls,
        },
      });
    } catch (fallbackError) {
      // Both providers failed — log and return 500
      const errorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

      console.error("Image generation error (both Z-Image and MiniMax failed):", {
        prompt: imgPrompt?.substring(0, 100),
        aspect_ratio: imgAspectRatio,
        n: imgN,
        has_subject_reference: imgSubjectRef && imgSubjectRef.length > 0,
        primary_error: primaryError instanceof Error ? primaryError.message : String(primaryError),
        fallback_error: errorMsg,
      });

      res.status(500).json({
        error: `Image generation failed: ${errorMsg}`,
      });
    }
  }
});

// ---------------------------------------------------------------------------
// TTS
// ---------------------------------------------------------------------------

app.post("/api/tts", async (req: Request, res: Response) => {
  try {
    const { model = "speech-01-tba", text, stream, language_boost, output_format, voice_setting, audio_setting, pronunciation_dict, subtitle_enable } = req.body;

    const result = await proxyToMiniMax<{
      data: { audio?: string };
    }>("/t2a_v2", {
      model,
      text,
      stream,
      language_boost,
      output_format,
      voice_setting,
      audio_setting,
      pronunciation_dict,
      subtitle_enable,
    });

    res.json(result);
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "TTS generation failed",
    });
  }
});

// ---------------------------------------------------------------------------
// Generation task system
// ---------------------------------------------------------------------------
import { loadJournals, saveJournal, deleteJournal, getJournalById, journalExists } from "./storage/journalStore.js";
import type { Journal } from "./storage/journalStore.js";
import { createTaskRepository } from "./generation/taskRepository.js";
import { createGenerationTaskService } from "./generation/taskService.js";
import { createGenerationRoutes } from "./generation/routes/generationRoutes.js";
import { createTaskScheduler } from "./generation/taskScheduler.js";
import { createTaskRecovery } from "./generation/taskRecovery.js";
import { createDraftRunner } from "./generation/runners/draftRunner.js";
import { createMediaRunner } from "./generation/runners/mediaRunner.js";
import { executeMediaTask } from "./generation/runners/executeMediaTask.js";
import { createGreetingRunner } from "./generation/runners/greetingRunner.js";
import { createGreetingScheduler } from "./generation/greetingScheduler.js";
import { createCompanionRoutes } from "./companion/routes/companionRoutes";
import { createMemoryItemStore } from "./companion/store/memoryItemStore";
import { createRelationshipStateStore } from "./companion/store/relationshipStateStore";
import { createUnlockEventStore } from "./companion/store/unlockEventStore";
import { createFeedbackStore } from "./companion/store/feedbackStore";
import { createMemoryExtractionService } from "./companion/services/memoryExtractionService";
import { createRelationshipProgressionService } from "./companion/services/relationshipProgressionService";
import { createUnlockEventService } from "./companion/services/unlockEventService";
import { createJournalPostProcessor } from "./companion/services/journalPostProcessor";
import { createGreetingRoutes } from "./generation/routes/greetingRoutes.js";
import { createGreetingSettingsStore } from "./storage/greetingSettingsStore.js";
import { saveImage, saveAudio, generateImageFilename, generateAudioFilename } from "./storage/mediaStore.js";

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd());
const taskRepository = createTaskRepository(
  process.env.GENERATION_TASK_DB_PATH ?? path.join(DATA_DIR, "generation-tasks.db"),
);
const generationTaskService = createGenerationTaskService(taskRepository);

const draftRunner = createDraftRunner({
  generateDraft: async (input: Record<string, unknown>) => {
    const provider = await getContentProvider();
    const result = await provider.generate({
      mood: input.mood as "开心" | "想念" | "感动" | "平静" | "调皮",
      date: input.date as string,
      recalledMemory: input.recalledMemory as string | undefined,
      voiceStyle: input.voiceStyle as "soft" | "warm" | "playful" | undefined,
      sceneHint: input.sceneHint as string | undefined,
    });
    return {
      journalContent: result.journalContent,
      voiceScripts: result.voiceScripts,
      source: "remote",
    };
  },
});

const mediaRunner = createMediaRunner({
  runMedia: async (input: Record<string, unknown>) => executeMediaTask(Number(PORT), input),
});

const greetingSettingsStore = createGreetingSettingsStore(taskRepository["_db"] as Parameters<typeof createGreetingSettingsStore>[0]);

const greetingRunner = createGreetingRunner({ port: Number(PORT) });

const scheduler = createTaskScheduler({
  repository: taskRepository,
  runners: {
    draft_generation: draftRunner,
    media_generation: mediaRunner,
    selfie_generation: async () => ({ output: {}, resultSummary: { outcome: "full_success" } }),
    daily_greeting: greetingRunner,
  },
  leaseMs: 30_000,
  workerId: "api-process-1",
});

const recovery = createTaskRecovery(taskRepository);

setInterval(() => {
  void scheduler.tick();
  recovery.scan(new Date().toISOString());
}, 1_000);

app.use("/api/generation/tasks", createGenerationRoutes(generationTaskService));
app.use("/api/companion", createCompanionRoutes());
app.use("/api/greetings", createGreetingRoutes({
  settingsStore: greetingSettingsStore,
  taskService: generationTaskService,
}));

// Start greeting scheduler after 5-second delay
setTimeout(() => {
  const stopGreetingScheduler = createGreetingScheduler({
    settingsStore: greetingSettingsStore,
    taskService: generationTaskService,
  }).start();
  console.log("[greetingScheduler] Started");
  // On shutdown: stopGreetingScheduler()
}, 5_000);

// ---------------------------------------------------------------------------
// Companion domain — module-level stores, services, and post-processor
// ---------------------------------------------------------------------------
const memoryItemStore = createMemoryItemStore(appDb);
const relationshipStateStore = createRelationshipStateStore(appDb);
const unlockEventStore = createUnlockEventStore(appDb);
const feedbackStore = createFeedbackStore(appDb);

const memoryExtractionService = createMemoryExtractionService();
const relationshipProgressionService = createRelationshipProgressionService();
const unlockEventService = createUnlockEventService();

const journalPostProcessor = createJournalPostProcessor({
  extractMemories: memoryExtractionService.extractFromJournal,
  advanceRelationship: relationshipProgressionService.advance,
  evaluateUnlocks: unlockEventService.evaluate,
  insertMemory: (record) => memoryItemStore.insert(record),
  saveRelationship: (record) => relationshipStateStore.upsert(record),
  saveUnlock: (record) => unlockEventStore.insert(record),
});

console.log("[companion] Journal post-processor wired into journal save pipeline");

// ---------------------------------------------------------------------------
// Media storage API endpoints
// ---------------------------------------------------------------------------

/**
 * Extract base64 data from a data URL string.
 * Handles formats like: data:image/jpeg;base64,/9j/4AAQ...
 */
function extractBase64(dataUrl: string): string {
  if (!dataUrl.includes(",")) {
    return dataUrl;
  }
  return dataUrl.split(",")[1];
}

app.post("/api/media/images", async (req: Request, res: Response) => {
  try {
    const { imageData } = req.body as { imageData?: string };
    if (!imageData) {
      res.status(400).json({ error: "imageData is required" });
      return;
    }

    const filename = generateImageFilename(imageData);
    const url = await saveImage(imageData, filename);
    res.json({ url });
  } catch (error) {
    console.error("Failed to save image:", error);
    res.status(500).json({ error: "Failed to save image" });
  }
});

app.post("/api/media/audio", async (req: Request, res: Response) => {
  try {
    const { audioData } = req.body as { audioData?: string };
    if (!audioData) {
      res.status(400).json({ error: "audioData is required" });
      return;
    }

    const filename = generateAudioFilename(audioData);
    const url = await saveAudio(audioData, filename);
    res.json({ url });
  } catch (error) {
    console.error("Failed to save audio:", error);
    res.status(500).json({ error: "Failed to save audio" });
  }
});

// ---------------------------------------------------------------------------
// Media static file serving (for Phase 4-5 media uploads)
// ---------------------------------------------------------------------------
app.use("/media", express.static(path.join(process.env.DATA_DIR ?? ".", "storage")));

// ---------------------------------------------------------------------------
// Journal CRUD endpoints
// ---------------------------------------------------------------------------

// GET /api/journals — returns all journals
app.get("/api/journals", async (_req: Request, res: Response) => {
  try {
    const journals = await loadJournals();
    res.json(journals);
  } catch (error) {
    console.error("Failed to load journals:", error);
    res.status(500).json({ error: "Failed to load journals" });
  }
});

// POST /api/journals — save a journal (upsert)
app.post("/api/journals", async (req: Request, res: Response) => {
  try {
    const journal = req.body as Journal;
    if (!journal || !journal.id || !journal.date) {
      res.status(400).json({ error: "Invalid journal: id and date are required" });
      return;
    }
    await saveJournal(journal);

    // -------------------------------------------------------------------------
    // COMPANION POST-PROCESSING HOOK:
    // Processes OOTD likes and relationship state after a journal is saved.
    // Loads journals via JSON store to count user journals; counts OOTD
    // reactions from the SQLite feedback store.
    // -------------------------------------------------------------------------
    const userId = (journal as { userId?: string }).userId;
    if (userId) {
      const previousRelationship = relationshipStateStore.findByUserId(userId);
      if (previousRelationship) {
        const allJournals = await loadJournals();
        const journalCount = allJournals.filter((j) => {
          if (j.userId) return j.userId === userId;
          return userId === "local-user";
        }).length;
        const ootdLikeCount = feedbackStore.countOotdReactionsByUserId(userId);
        journalPostProcessor.process({
          userId,
          journalId: journal.id,
          content: journal.content,
          previousRelationship,
          journalCount,
          feedbackCount: 0,
          ootdLikeCount,
        });
      }
    }
    // -------------------------------------------------------------------------

    res.status(201).json(journal);
  } catch (error) {
    console.error("Failed to save journal:", error);
    res.status(500).json({ error: "Failed to save journal" });
  }
});

// GET /api/journals/:id — returns a single journal
app.get("/api/journals/:id", async (req: Request, res: Response) => {
  try {
    const journal = await getJournalById(req.params.id);
    if (!journal) {
      res.status(404).json({ error: "Journal not found" });
      return;
    }
    res.json(journal);
  } catch (error) {
    console.error("Failed to get journal:", error);
    res.status(500).json({ error: "Failed to get journal" });
  }
});

// DELETE /api/journals/:id — deletes a journal
app.delete("/api/journals/:id", async (req: Request, res: Response) => {
  try {
    await deleteJournal(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete journal:", error);
    res.status(500).json({ error: "Failed to delete journal" });
  }
});

// PUT /api/journals/date/:date — replace journal entry for a given date (used for manual refresh)
app.put("/api/journals/date/:date", async (req: Request, res: Response) => {
  try {
    const dateToReplace = req.params.date;
    const replacementJournal = req.body as Journal;
    if (!replacementJournal || !replacementJournal.id || !replacementJournal.date) {
      res.status(400).json({ error: "Invalid journal: id and date are required" });
      return;
    }
    if (replacementJournal.date !== dateToReplace) {
      res.status(400).json({ error: "Journal date does not match the requested date" });
      return;
    }
    const allJournals = await loadJournals();
    // Remove existing entries for this date (both the entry and any daily-summary)
    // Note: single-user app — no user isolation needed for this endpoint
    const filtered = allJournals.filter((j) => j.date !== dateToReplace && j.id !== `journal-day-${dateToReplace}`);
    await saveJournal(replacementJournal);
    res.status(200).json(replacementJournal);
  } catch (error) {
    console.error("Failed to replace journal:", error);
    res.status(500).json({ error: "Failed to replace journal" });
  }
});

// ---------------------------------------------------------------------------
// Health and info
// ---------------------------------------------------------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "journal-app-backend", timestamp: new Date().toISOString() });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Journal App Backend API",
    version: "0.1.0",
    contentProvider: CONTENT_PROVIDER,
    endpoints: ["/api/health", "/api/image-generation", "/api/tts", "/api/content-generation"],
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(Number(PORT), HOST, () => {
  console.log(`Backend server running on http://${HOST}:${PORT}`);
  console.log(`Content provider: ${CONTENT_PROVIDER}`);
  if (!MINIMAX_API_KEY) {
    console.warn("Warning: MINIMAX_API_KEY not set in environment");
  }
});
