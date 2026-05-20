/**
 * MiniMax content generation provider.
 * Uses MiniMax's text generation API for journal and voice script content.
 */

import type { ContentProvider, ContentProviderInput, ContentProviderOutput } from "./contentProvider.js";

const TIMING_LABELS: Record<string, string> = {
  morning: "早安",
  afternoon: "午后",
  night: "晚安",
};

export class MiniMaxContentProvider implements ContentProvider {
  name(): string {
    return "minimax";
  }

  async generate(input: ContentProviderInput): Promise<ContentProviderOutput> {
    const moodStyles: Record<string, string> = {
      "开心": "甜蜜温暖，开心愉悦",
      "想念": "真挚感人，思念绵绵",
      "感动": "温暖感恩，被温柔触动",
      "平静": "舒缓平和，内心宁静",
      "调皮": "可爱俏皮，有点小坏",
    };

    const mood = input.mood;
    const memoryContext = input.recalledMemory
      ? `\n女朋友之前写过：${input.recalledMemory}`
      : "";

    // MiniMax doesn't have a chat completion API in this integration,
    // so this provider acts as a placeholder for potential future MiniMax text generation.
    // For now, fall back to a simple generated response.
    const journalContent = `今天的心情是${mood}，${moodStyles[mood] || "温暖的一天"}。${memoryContext || "想和你一起记录每一天。"}`;

    const voiceScripts = Object.entries(TIMING_LABELS).map(([timing, label], i) => ({
      timing: timing as "morning" | "afternoon" | "night",
      transcript: `${label}，今天也要开心哦`,
      duration: i === 0 ? "0:12" : i === 1 ? "0:15" : "0:18",
    }));

    return { journalContent, voiceScripts };
  }
}

export function createMiniMaxContentProvider(): ContentProvider {
  return new MiniMaxContentProvider();
}