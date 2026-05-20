/**
 * MiniMax service - generation orchestration layer.
 *
 * Media (image / TTS / selfie) calls now go through the thin apiClient
 * wrapper so no API keys are ever exposed to the browser.
 */

import { fetchImageAsBase64, generateImages, generateSelfies, synthesizeSpeech } from "./api/mediaClient";
import type { Journal, Mood, VoiceMessage } from "../types/journal";
import { buildNightBonusPrompt } from "./nightBonusSelfie";
import { GIRLFRIEND_ANCHOR } from "./girlfriendProfile";
import { extractSceneContext } from "./sceneExtractor";
import { getBackendUrl } from "./config";

function getApiBase(): string {
  return getBackendUrl();
}

function normalizeBackendMediaUrl(url: string): string {
  if (url.startsWith("/media/")) {
    return `${getApiBase()}${url}`;
  }
  return url;
}

export type JournalMediaErrors = {
  image?: string;
  voice?: string;
};

export type JournalMediaResult = {
  journal: Journal;
  errors: JournalMediaErrors;
  selfies?: GirlfriendSelfieResult;
};

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

// Stable hash for deterministic uniqueness within same journal content
function stableHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(-6);
}

export function buildJournalImagePrompt(
  journal: Pick<Journal, "mood" | "content" | "date" | "weekday">,
  options?: {
    referenceImage?: string;
    extra?: string;
    sceneHint?: string;
  },
) {
  // Stable uniqueness token - deterministic for same content
  const uniqueHint = options?.extra ?? `entry-${stableHash(journal.content)}`;

  // Extract SceneContext from journal content
  const extractedContext = extractSceneContext(journal.content, journal.mood, journal.date);

  // When sceneHint is provided, prefer it over extracted context for scene/atmosphere
  const sceneContext = options?.sceneHint
    ? {
        ...extractedContext,
        scene: options.sceneHint,
        atmosphere: `用户场景：${options.sceneHint}`,
      }
    : extractedContext;

  const parts = [
    GIRLFRIEND_ANCHOR,
    "写实生活摄影风格。",
    "像手机或轻写真记录下来的真实日常场景。",
    `Mood: ${journal.mood}.`,
    `Date: ${journal.date} ${journal.weekday}.`,
    `Scene: ${sceneContext.scene}.`,
    `Activity: ${sceneContext.activity}.`,
    `Action: ${sceneContext.action}.`,
    `Expression: ${sceneContext.expression}.`,
    `Clothing: ${sceneContext.clothingHint}.`,
    `Atmosphere: ${sceneContext.atmosphere}.`,
    `Content hint: ${journal.content.slice(0, 120)}.`,
    `Unique scene token: ${uniqueHint}`,
    "No text overlays. Natural lighting. Human, believable, intimate daily life.",
  ];

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Image persistence helper
// ---------------------------------------------------------------------------

/**
 * Upload a data URL image to the backend and return the stable URL.
 * Returns the original URL if it's not a data URL or if upload fails.
 */
export async function persistImageIfNeeded(url: string): Promise<string> {
  if (url.startsWith(`${getApiBase()}/media/`) || url.startsWith("/media/")) {
    return normalizeBackendMediaUrl(url);
  }

  let imageData = url;
  if (!url.startsWith("data:")) {
    const fetched = await fetchImageAsBase64(url);
    if (!fetched.dataUrl) {
      return url;
    }
    imageData = fetched.dataUrl;
  }

  try {
    const response = await fetch(`${getApiBase()}/api/media/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData }),
    });

    if (!response.ok) {
      console.warn("[minimax] Failed to persist image:", response.status);
      return url;
    }

    const result = (await response.json()) as { url?: string };
    return result.url ? normalizeBackendMediaUrl(result.url) : url;
  } catch (error) {
    console.warn("[minimax] Image persistence error:", error);
    return url;
  }
}

/**
 * Persist multiple images, replacing data URLs with stable backend URLs.
 * Preserves original URLs if upload fails.
 */
export async function persistImagesIfNeeded(urls: string[]): Promise<string[]> {
  const results = await Promise.all(urls.map((url) => persistImageIfNeeded(url)));
  return results;
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export async function generateMinimaxImages(
  prompt: string,
  options?: {
    n?: number;
    aspectRatio?: string;
    promptOptimizer?: boolean;
  },
) {
  const result = await generateImages({
    prompt,
    n: options?.n,
    aspectRatio: options?.aspectRatio,
    promptOptimizer: options?.promptOptimizer,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  // Persist any data URLs to backend
  return persistImagesIfNeeded(result.urls);
}

// ---------------------------------------------------------------------------
// Audio persistence helper
// ---------------------------------------------------------------------------

/**
 * Upload a data URL audio to the backend and return the stable URL.
 * Returns the original URL if it's not a data URL or if upload fails.
 */
export async function persistAudioIfNeeded(url: string): Promise<string> {
  if (url.startsWith(`${getApiBase()}/media/`) || url.startsWith("/media/")) {
    return normalizeBackendMediaUrl(url);
  }

  if (!url.startsWith("data:")) {
    return url;
  }

  try {
    const response = await fetch(`${getApiBase()}/api/media/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioData: url }),
    });

    if (!response.ok) {
      console.warn("[minimax] Failed to persist audio:", response.status);
      return url;
    }

    const result = (await response.json()) as { url?: string };
    return result.url ? normalizeBackendMediaUrl(result.url) : url;
  } catch (error) {
    console.warn("[minimax] Audio persistence error:", error);
    return url;
  }
}

/**
 * Persist multiple audio data URLs, replacing them with stable backend URLs.
 * Preserves original URLs if upload fails.
 */
export async function persistAudiosIfNeeded(voiceMessages: VoiceMessage[]): Promise<VoiceMessage[]> {
  const results = await Promise.all(
    voiceMessages.map(async (vm) => {
      if (vm.audioUrl) {
        const persistedUrl = await persistAudioIfNeeded(vm.audioUrl);
        return { ...vm, audioUrl: persistedUrl };
      }
      return vm;
    }),
  );
  return results;
}

// ---------------------------------------------------------------------------
// TTS / speech synthesis for single text (e.g., journal content)
// ---------------------------------------------------------------------------

export async function synthesizeContentSpeech(
  text: string,
  options?: {
    mood?: Mood;
    voiceStyle?: "soft" | "warm" | "playful";
  },
): Promise<string | null> {
  const result = await synthesizeSpeech({
    text,
    mood: options?.mood ?? "开心",
    voiceStyle: options?.voiceStyle,
    outputFormat: "hex",
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.audioDataUrl;
}

export async function synthesizeVoiceMessages(
  voiceMessages: VoiceMessage[],
  options?: {
    mood?: Mood;
    voiceStyle?: "soft" | "warm" | "playful";
  },
) {
  // Concurrency limit: max 2 parallel TTS requests to avoid API overload
  const concurrencyLimit = 2;

  // Process in chunks of concurrencyLimit
  const chunkSize = concurrencyLimit;
  const chunks: VoiceMessage[][] = [];
  for (let i = 0; i < voiceMessages.length; i += chunkSize) {
    chunks.push(voiceMessages.slice(i, i + chunkSize));
  }

  const allResults: Array<{ message: VoiceMessage; audioUrl: string }> = [];
  const allErrors: string[] = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(async (message) => {
        const result = await synthesizeSpeech({
          text: message.transcript,
          mood: options?.mood ?? "开心",
          voiceStyle: options?.voiceStyle,
          outputFormat: "hex",
        });
        if (result.error || !result.audioDataUrl) {
          throw new Error(result.error ?? "语音合成返回空数据");
        }
        return { message, audioUrl: result.audioDataUrl };
      }),
    );

    for (const r of chunkResults) {
      if (r.status === "fulfilled") {
        allResults.push(r.value);
      } else {
        allErrors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      }
    }
  }

  const enriched: VoiceMessage[] = voiceMessages.map((vm) => {
    const found = allResults.find((r) => r.message.id === vm.id);
    return found ? { ...vm, audioUrl: found.audioUrl } : vm;
  });

  // Persist data URL audio to backend, replacing with stable URLs
  const persistedEnriched = await persistAudiosIfNeeded(enriched);

  const failedCount = voiceMessages.length - allResults.length;
  let error: string | undefined;
  if (failedCount > 0) {
    error = allErrors.length > 0
      ? allErrors[0]  // Use first actual error message
      : `语音生成部分失败：${failedCount} 条失败`;
  }

  return {
    voiceMessages: persistedEnriched,
    error,
  };
}

// ---------------------------------------------------------------------------
// Journal media pipeline
// ---------------------------------------------------------------------------

export async function buildJournalMedia(
  journal: Journal,
  options?: {
    referenceImage?: string;
    generateSelfies?: boolean;
    sceneHint?: string;
  },
) {
  const { referenceImage, generateSelfies = true, sceneHint } = options ?? {};

  let imageError: string | undefined;
  let images = journal.images?.length ? journal.images : undefined;

  // Parallel: image + voice
  const [imageResult, voiceResult] = await Promise.allSettled([
    images
      ? Promise.resolve(undefined)
      : generateMinimaxImages(buildJournalImagePrompt(journal, { sceneHint }), { n: 2 }),
    synthesizeVoiceMessages(journal.voiceMessages, {
      mood: journal.mood,
      voiceStyle: journal.voiceStyle,
    }),
  ]);

  if (imageResult.status === "rejected") {
    imageError = `图片生成失败：${imageResult.reason instanceof Error ? imageResult.reason.message : String(imageResult.reason)}`;
  } else if (imageResult.value) {
    images = imageResult.value;
  }

  const voiceError = voiceResult.status === "rejected"
    ? `语音生成失败：${voiceResult.reason instanceof Error ? voiceResult.reason.message : String(voiceResult.reason)}`
    : (voiceResult.value as Awaited<ReturnType<typeof synthesizeVoiceMessages>>).error;

  let selfies: GirlfriendSelfieResult | undefined;
  if (generateSelfies && referenceImage) {
    selfies = await generateGirlfriendSelfies(journal.mood, referenceImage, journal.content, journal.date);
  }

  return {
    journal: {
      ...journal,
      images,
      voiceMessages: (voiceResult.status === "fulfilled" ? voiceResult.value?.voiceMessages : journal.voiceMessages) ?? journal.voiceMessages,
    },
    errors: {
      image: imageError,
      voice: voiceError,
    },
    selfies,
  };
}

// ---------------------------------------------------------------------------
// Selfie generation
// ---------------------------------------------------------------------------

export type GirlfriendSelfieResult = {
  morningSelfie?: string;
  eveningSelfie?: string;
  latestSelfie?: string;
  error?: string;
  eveningWarning?: string;
};

export async function generateGirlfriendSelfies(
  mood: Mood,
  referenceImage?: string,
  content?: string,
  date?: string,
): Promise<GirlfriendSelfieResult> {
  // Extract full scene context for complete visual hints
  const sceneContext = content
    ? extractSceneContext(content, mood, date ?? new Date().toISOString().split("T")[0])
    : null;

  try {
    // Build visual hints from scene context
    const visualHints = sceneContext
      ? {
          scene: sceneContext.scene,
          action: sceneContext.action,
          expression: sceneContext.expression,
          clothingHint: sceneContext.clothingHint,
          atmosphere: sceneContext.atmosphere,
        }
      : undefined;

    // Generate morning selfie first
    const morningResult = await generateSelfies({ mood, referenceImage, n: 1, visualHints });
    if (morningResult.error || morningResult.selfies.length === 0) {
      return {
        morningSelfie: undefined,
        latestSelfie: undefined,
        error: morningResult.error ?? "自拍生成返回空结果",
      };
    }

    // Morning succeeded - persist if needed, then save as latest
    const morningSelfie = await persistImageIfNeeded(morningResult.selfies[0]);
    const latestSelfie = morningSelfie;

    // Use morning result as reference for evening selfie
    const eveningResult = await generateSelfies({ mood, referenceImage: latestSelfie, n: 1, visualHints });

    let eveningSelfie: string | undefined;
    let eveningWarning: string | undefined;

    if (!eveningResult.error && eveningResult.selfies.length > 0) {
      eveningSelfie = await persistImageIfNeeded(eveningResult.selfies[0]);
    } else if (eveningResult.error) {
      // Evening failed - report as warning, not error (morning succeeded)
      eveningWarning = eveningResult.error;
    }

    return {
      morningSelfie,
      eveningSelfie,
      latestSelfie,
      error: undefined,
      eveningWarning,
    };
  } catch (error) {
    return {
      morningSelfie: undefined,
      eveningSelfie: undefined,
      latestSelfie: undefined,
      error: `自拍生成失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function generateNightBonusSelfie(
  mood: Mood,
  referenceImage?: string,
): Promise<{
  selfie?: string;
  error?: string;
}> {
  const result = await generateSelfies({
    mood,
    referenceImage,
    n: 1,
    promptSuffix: buildNightBonusPrompt(mood),
  });

  return {
    selfie: result.selfies[0],
    error: result.error,
  };
}
