/**
 * Journal draft generation - orchestrates content + voice script generation.
 * Uses backend task system when available, falls back to direct API calls.
 */

import { generateJournalContent } from "./api/contentClient";
import type { Mood, VoiceMessage } from "../types/journal";
import { polishContent } from "./contentPolish";
import { recallWithStrategy, buildMemoryContext } from "./recallStrategy";
import { createGenerationTask } from "./generation/apiTaskClient";
import { pollGenerationTask } from "./generation/taskPolling";

export type JournalDraft = {
  content: string;
  voiceMessages: VoiceMessage[];
  memoryActivated: boolean;
  source: "remote" | "fallback";
};

import { createMemoryEngine } from "./generator/index";

export type GenerateJournalDraftParams = {
  mood: Mood;
  date: string;
  memoryEngine: ReturnType<typeof createMemoryEngine>;
  voiceStyle?: "soft" | "warm" | "playful";
  sceneHint?: string;
  companionContext?: {
    relationshipStage: string;
    recalledMemory: string;
  };
};

export async function generateJournalDraft({
  mood,
  date,
  memoryEngine,
  voiceStyle,
  sceneHint,
  companionContext,
}: GenerateJournalDraftParams): Promise<JournalDraft> {
  // Try task-based generation first
  try {
    const recallResult = recallWithStrategy(memoryEngine, mood, date, 3);
    const memoryActivated = recallResult.strategy !== "no_memory";
    const memoryContext = buildMemoryContext(recallResult);

    const created = await createGenerationTask({
      type: "draft_generation",
      input: {
        mood,
        date,
        recalledMemory: (companionContext?.recalledMemory ?? memoryContext) || undefined,
        relationshipStage: companionContext?.relationshipStage,
        voiceStyle,
        sceneHint,
      },
      priority: 5,
    });

    const task = await pollGenerationTask(created.task.id);

    if (task.status === "succeeded" && task.output) {
      const output = task.output as {
        journalContent: string;
        voiceScripts: Array<{ timing: string; transcript: string; duration: string }>;
        source?: string;
      };

      const polished = polishContent(
        output.journalContent,
        output.voiceScripts.map(v => ({ timing: v.timing as VoiceMessage["timing"], transcript: v.transcript, duration: v.duration })),
      );

      return {
        content: polished.journal,
        voiceMessages: output.voiceScripts.map((v, i) => ({
          id: `voice-${v.timing}`,
          timing: v.timing as VoiceMessage["timing"],
          transcript: polished.voiceScripts[i]?.transcript ?? v.transcript,
          duration: v.duration,
        })),
        memoryActivated,
        source: (output.source as "remote" | "fallback") ?? "remote",
      };
    }

    // Task failed or returned unexpected state - fall through to direct generation
    if (task.error) {
      console.warn("Draft generation task failed, falling back to direct API:", task.error.message);
    }
  } catch (error) {
    // Task system unavailable, fall back to direct generation
    console.warn("Draft generation task system unavailable, falling back to direct API:", error);
  }

  // Fallback: direct API generation
  const recallResult = recallWithStrategy(memoryEngine, mood, date, 3);
  const memoryActivated = recallResult.strategy !== "no_memory";
  const memoryContext = buildMemoryContext(recallResult);

  const result = await generateJournalContent({
    mood,
    date,
    recalledMemory: memoryContext || undefined,
    voiceStyle,
    sceneHint,
  });

  const polished = polishContent(
    result.journalContent,
    result.voiceMessages.map(v => ({ timing: v.timing, transcript: v.transcript, duration: v.duration })),
  );

  return {
    content: polished.journal,
    voiceMessages: result.voiceMessages.map((v, i) => ({
      ...v,
      transcript: polished.voiceScripts[i]?.transcript ?? v.transcript,
    })),
    memoryActivated,
    source: result.source,
  };
}