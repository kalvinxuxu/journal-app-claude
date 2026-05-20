/**
 * Content generation API client - calls backend for real journal/voice script generation.
 * Falls back to local templates when backend is unavailable.
 */

import type { Mood } from "../../types/journal";
import type { VoiceMessage } from "../../types/journal";

const DEFAULT_BACKEND_URL = "http://localhost:3001";

function getBackendUrl() {
  const env = (import.meta.env as Record<string, string | undefined>);
  return env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL;
}

function normalizeUrl(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentGenerationInput = {
  mood: Mood;
  date: string;
  recalledMemory?: string;
  voiceStyle?: "soft" | "warm" | "playful";
  sceneHint?: string;
};

export type ContentGenerationResult = {
  journalContent: string;
  voiceMessages: VoiceMessage[];
  source: "remote" | "fallback";
  error?: string;
};

// ---------------------------------------------------------------------------
// Local fallback templates
// ---------------------------------------------------------------------------

const voiceTemplates: Record<Mood, string[]> = {
  "开心": [
    "今天也想把好心情分你一半。",
    "我刚刚想到你，嘴角就上去了。",
    "有些开心不说出来，反而会更明显。",
  ],
  "想念": [
    "我有点想你了，是真的那种。",
    "今天很多瞬间都让我想到你。",
    "如果你现在在我身边就好了。",
  ],
  "感动": [
    "你认真生活的样子，我都记得。",
    "有些温柔，是会慢慢沉下来的。",
    "谢谢你，真的。",
  ],
  "平静": [
    "今天很安静，安静得刚刚好。",
    "我想把这份平稳也留给你。",
    "慢一点也没关系。",
  ],
  "调皮": [
    "我知道你昨天又没早点睡。",
    "这次先不说你，给你留点面子。",
    "下次见面，我要当面问你。",
  ],
};

const journalOpeners: Record<Mood, string[]> = {
  "开心": ["今天阳光正好，想起你时心里甜甜的。", "翻开日记，想起和你一起的时光，忍不住笑了。", "今天的我，格外想你。"],
  "想念": ["有些距离，让思念变得更浓。", "今天的风，很想你。", "翻开这一页，全是你的影子。"],
  "感动": ["今天被温柔击中了，想起了你。", "生活的小确幸，想和你分享。", "有些话只想说给你听。"],
  "平静": ["今天很安静，适合想一些美好的事。", "慢下来，感受这一刻的宁静。", "简单的一天，简单地想你。"],
  "调皮": ["今天发现一个小秘密，想当面告诉你。", "某人昨天肯定又熬夜了对不对？", "猜猜我今天最想做什么？"],
};

function generateLocalDraft(mood: Mood, date: string): { content: string; voiceMessages: VoiceMessage[] } {
  const openers = journalOpeners[mood];
  const templates = voiceTemplates[mood];

  const content = openers[Math.floor(Math.random() * openers.length)];

  const voiceMessages: VoiceMessage[] = (["morning", "afternoon", "night"] as const).map((timing, i) => ({
    id: `generated-${timing}-${Date.now()}`,
    timing,
    transcript: templates[i % templates.length],
    duration: i === 0 ? "0:12" : i === 1 ? "0:15" : "0:18",
  }));

  return { content, voiceMessages };
}

// ---------------------------------------------------------------------------
// Remote generation
// ---------------------------------------------------------------------------

export async function generateJournalContent(
  input: ContentGenerationInput,
): Promise<ContentGenerationResult> {
  const base = normalizeUrl(getBackendUrl());
  const url = `${base}/api/content-generation`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood: input.mood,
        date: input.date,
        recalledMemory: input.recalledMemory,
        voiceStyle: input.voiceStyle,
        sceneHint: input.sceneHint,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    // Fall back to local templates on network error
    console.warn("[Content] Backend unavailable, using local templates:", err);
    const draft = generateLocalDraft(input.mood, input.date);
    return { journalContent: draft.content, voiceMessages: draft.voiceMessages, source: "fallback" };
  }

  if (!response.ok) {
    console.warn(`[Content] Backend returned ${response.status}, falling back to local templates`);
    const draft = generateLocalDraft(input.mood, input.date);
    return { journalContent: draft.content, voiceMessages: draft.voiceMessages, source: "fallback" };
  }

  const json = await response.json() as {
    journalContent?: string;
    voiceScripts?: Array<{ timing: string; transcript: string; duration?: string }>;
    error?: string;
  };

  if (json.error) {
    console.warn(`[Content] Backend error: ${json.error}, falling back to local templates`);
    const draft = generateLocalDraft(input.mood, input.date);
    return { journalContent: draft.content, voiceMessages: draft.voiceMessages, source: "fallback" };
  }

  const voiceMessages: VoiceMessage[] = (json.voiceScripts ?? []).map((script, i) => ({
    id: `generated-${script.timing}-${Date.now()}`,
    timing: script.timing as VoiceMessage["timing"],
    transcript: script.transcript,
    duration: script.duration ?? (i === 0 ? "0:12" : i === 1 ? "0:15" : "0:18"),
  }));

  return {
    journalContent: json.journalContent ?? "今天也在这里陪着你。",
    voiceMessages,
    source: "remote",
  };
}