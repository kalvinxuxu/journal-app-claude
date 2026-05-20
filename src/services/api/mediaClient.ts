/**
 * Media API client - thin frontend wrapper for backend media endpoints.
 * All actual API keys stay server-side; frontend only calls localhost endpoints.
 */

import type { Mood } from "../../types/journal";
import { GIRLFRIEND_ANCHOR } from "../girlfriendProfile";

const DEFAULT_BACKEND_URL = "http://localhost:3001";

// ---------------------------------------------------------------------------
// Retry helper with exponential backoff
// ---------------------------------------------------------------------------

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
};

export async function fetchWithRetry<T>(
  url: string,
  options: RetryOptions & {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<{ data?: T; error?: string }> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const timeoutMs = options.timeoutMs ?? 30000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = `HTTP ${response.status}`;
        if (attempt < retries && response.status >= 500) {
          // Retry on server errors with backoff
          const delay = baseDelayMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return { error: errorText };
      }

      const json = await response.json() as T;
      return { data: json };
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { error: "Max retries exceeded" };
}

export function getBackendUrl() {
  const env = (import.meta.env as Record<string, string | undefined>);
  return env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const base = getBackendUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeUrl(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export type ImageGenerationOptions = {
  prompt: string;
  n?: number;
  aspectRatio?: string;
  promptOptimizer?: boolean;
};

export type ImageGenerationResult = {
  urls: string[];
  error?: string;
};

export async function generateImages(
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  const base = normalizeUrl(getBackendUrl());
  const url = `${base}/api/image-generation`;

  const result = await fetchWithRetry<{
    data?: { image_urls?: string[]; image_base64?: string[] };
    error?: string;
  }>(url, {
    method: "POST",
    body: JSON.stringify({
      model: "image-01",
      prompt: options.prompt,
      aspect_ratio: options.aspectRatio ?? "16:9",
      response_format: "url",
      n: options.n ?? 2,
      prompt_optimizer: options.promptOptimizer ?? true,
    }),
    retries: 3,
    baseDelayMs: 1000,
    timeoutMs: 60000,
  });

  if (result.error) {
    return { urls: [], error: `图片生成失败：${result.error}` };
  }

  if (!result.data) {
    return { urls: [], error: "图片生成返回空数据" };
  }

  if (result.data.error) {
    return { urls: [], error: result.data.error };
  }

  const urls = result.data.data?.image_urls ?? [];
  return { urls };
}

// ---------------------------------------------------------------------------
// TTS / speech synthesis
// ---------------------------------------------------------------------------

type VoiceSetting = {
  voice_id: string;
  speed: number;
  vol: number;
  pitch: number;
  emotion: string;
};

function buildVoiceSetting(mood: Mood, voiceStyle?: "soft" | "warm" | "playful"): VoiceSetting {
  const emotionMap: Record<Mood, string> = {
    开心: "happy",
    想念: "sad",
    感动: "touching",
    平静: "calm",
    调皮: "playful",
  };

  // Mapped to current official MiniMax system voices.
  // soft: calm, gentle, slightly mature
  // warm: intimate companion tone
  // playful: brighter and more teasing
  const voiceStyleMap: Record<string, { voice_id: string; speed: number; pitch: number }> = {
    soft: {
      voice_id: "Chinese (Mandarin)_Gentle_Senior",
      speed: 0.96,
      pitch: -1,
    },
    warm: {
      voice_id: "Chinese (Mandarin)_Warm_Bestie",
      speed: 1,
      pitch: 0,
    },
    playful: {
      voice_id: "qiaopi_mengmei",
      speed: 1.04,
      pitch: 1,
    },
  };
  const selected = voiceStyle
    ? voiceStyleMap[voiceStyle] ?? voiceStyleMap.warm
    : voiceStyleMap.warm;

  return {
    voice_id: selected.voice_id,
    speed: selected.speed,
    vol: 1,
    pitch: selected.pitch,
    emotion: emotionMap[mood],
  };
}

export type TtsOptions = {
  text: string;
  mood: Mood;
  voiceStyle?: "soft" | "warm" | "playful";
  outputFormat?: "hex" | "mp3";
};

export type TtsResult = {
  audioDataUrl: string | null;
  error?: string;
};

export async function synthesizeSpeech(
  options: TtsOptions,
): Promise<TtsResult> {
  const base = normalizeUrl(getBackendUrl());
  const url = `${base}/api/tts`;

  const body = {
    model: "speech-2.8-hd",
    text: options.text,
    stream: false,
    language_boost: "auto",
    output_format: options.outputFormat ?? "hex",
    voice_setting: buildVoiceSetting(options.mood, options.voiceStyle),
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
    pronunciation_dict: {},
    subtitle_enable: false,
  };

  const result = await fetchWithRetry<{ data?: { audio?: string }; error?: string }>(
    url,
    {
      method: "POST",
      body: JSON.stringify(body),
      retries: 2,
      baseDelayMs: 1500,
      timeoutMs: 30000,
    },
  );

  if (result.error) {
    return { audioDataUrl: null, error: `语音合成请求失败：${result.error}` };
  }

  if (!result.data) {
    return { audioDataUrl: null, error: "语音合成返回空数据" };
  }

  if (result.data.error) {
    return { audioDataUrl: null, error: result.data.error };
  }

  const hex = result.data.data?.audio;
  if (!hex) {
    return { audioDataUrl: null, error: "语音合成返回空数据" };
  }

  // Convert hex string to complete byte array first, then encode as base64 in one pass
  // This avoids the chunk-alignment bug where per-chunk btoa() produces invalid Base64
  const hexBytes = hex.match(/.{1,2}/g) ?? [];
  const byteArray = new Uint8Array(hexBytes.length);
  for (let i = 0; i < hexBytes.length; i++) {
    byteArray[i] = parseInt(hexBytes[i], 16);
  }
  // Convert to base64 using binary string (btoa works on complete byte array)
  const binaryString = Array.from(byteArray, b => String.fromCharCode(b)).join('');
  const base64 = btoa(binaryString);
  const dataUrl = `data:audio/mpeg;base64,${base64}`;

  return { audioDataUrl: dataUrl };
}

// ---------------------------------------------------------------------------
// Image URL utilities
// ---------------------------------------------------------------------------

export type FetchImageAsBase64Result = {
  dataUrl: string | null;
  error?: string;
};

/**
 * Fetches an image URL and converts to a stable base64 data URL.
 * This prevents signed URLs from expiring when stored long-term.
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<FetchImageAsBase64Result> {
  let response: Response;
  try {
    response = await fetch(imageUrl);
  } catch (err) {
    return { dataUrl: null, error: `图片获取失败：${err instanceof Error ? err.message : String(err)}` };
  }

  if (!response.ok) {
    return { dataUrl: null, error: `图片获取失败：HTTP ${response.status}` };
  }

  try {
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array, b => String.fromCharCode(b)).join('');
    const base64 = btoa(binaryString);
    const mimeType = blob.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return { dataUrl };
  } catch (err) {
    return { dataUrl: null, error: `图片转换失败：${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Validates an image URL by performing a HEAD request with timeout.
 * Returns true if URL is accessible.
 */
export async function validateImageUrl(imageUrl: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(imageUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Selfie generation (character consistency via reference image)
// ---------------------------------------------------------------------------

export type SelfieVisualHints = {
  scene?: string;
  action?: string;
  expression?: string;
  clothingHint?: string;
  atmosphere?: string;
};

export type SelfieGenerationOptions = {
  mood: Mood;
  referenceImage?: string;
  n?: number;
  promptSuffix?: string;
  visualHints?: SelfieVisualHints;
};

export type SelfieGenerationResult = {
  selfies: string[];
  referenceImage?: string;
  error?: string;
};

export async function generateSelfies(
  options: SelfieGenerationOptions,
): Promise<SelfieGenerationResult> {
  const base = normalizeUrl(getBackendUrl());
  const url = `${base}/api/image-generation`;

  async function requestSelfies(includeReference: boolean): Promise<SelfieGenerationResult> {
    const promptParts: string[] = [GIRLFRIEND_ANCHOR];
    if (options.visualHints) {
      const { scene, action, expression, clothingHint, atmosphere } = options.visualHints;
      if (scene) promptParts.push(`Scene: ${scene}`);
      if (action) promptParts.push(`Action: ${action}`);
      if (expression) promptParts.push(`Expression: ${expression}`);
      if (clothingHint) promptParts.push(`Clothing: ${clothingHint}`);
      if (atmosphere) promptParts.push(`Atmosphere: ${atmosphere}`);
    } else {
      promptParts.push(`Mood: ${options.mood}`);
    }
    if (options.promptSuffix) {
      promptParts.push(options.promptSuffix);
    }
    const body: Record<string, unknown> = {
      model: "image-01",
      prompt: promptParts.join(" ").replace(/\s+/g, " ").trim(),
      aspect_ratio: "1:1",
      response_format: "url",
      n: options.n ?? 2,
    };

    if (includeReference && options.referenceImage) {
      body.subject_reference = [
        {
          type: "character",
          image_file: options.referenceImage,
        },
      ];
    }

    const result = await fetchWithRetry<{
      data?: { image_urls?: string[]; image_base64?: string[] };
      error?: string;
    }>(url, {
      method: "POST",
      body: JSON.stringify(body),
      retries: 2,
      baseDelayMs: 1500,
      timeoutMs: 60000,
    });

    if (result.error) {
      return { selfies: [], error: `自拍生成请求失败：${result.error}` };
    }

    if (!result.data) {
      return { selfies: [], error: "自拍生成返回空数据" };
    }

    if (result.data.error) {
      return { selfies: [], error: result.data.error };
    }

    const urls = result.data.data?.image_urls ?? [];
    if (urls.length === 0) {
      return { selfies: [], error: "自拍生成返回空结果" };
    }

    return {
      selfies: urls,
      referenceImage: urls[0],
    };
  }

  const withReference = await requestSelfies(Boolean(options.referenceImage));
  if (!withReference.error || !options.referenceImage) {
    return withReference;
  }

  console.warn("[mediaClient] Selfie generation failed with reference image, retrying without reference");
  return requestSelfies(false);
}
