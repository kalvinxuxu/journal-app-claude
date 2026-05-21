import type { ContentProviderInput } from "./contentProvider.js";
import { sanitizeContent } from "../utils/contentSanitizer.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const TIMING_LABELS: Record<string, string> = {
  morning: "早安",
  afternoon: "午安",
  night: "晚安",
};

async function callDeepSeek<T>(body: object): Promise<T> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${JSON.stringify(data)}`);
  }

  return data as T;
}

export interface GreetingContentResult {
  greetingContent: string;
  voiceScript: {
    timing: "morning" | "afternoon" | "night";
    transcript: string;
    duration: string;
  };
}

export async function generateGreetingContent(
  timing: "morning" | "afternoon" | "night",
  mood: string = "开心",
  voiceStyle?: "soft" | "warm" | "playful"
): Promise<GreetingContentResult> {
  const label = TIMING_LABELS[timing] ?? "你好";

  const moodStyles: Record<string, string> = {
    "开心": "开心愉悦",
    "想念": "思念绵绵",
    "感动": "温暖感恩",
    "平静": "舒缓平和",
    "调皮": "俏皮可爱",
  };

  const result = await callDeepSeek<{ choices: Array<{ message: { content: string } }> }>({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "你是女朋友。直接输出一句问候语，30-50字左右，甜蜜温柔，有情感描述。不输出其他内容。" },
      { role: "user", content: `现在是${label}时分，心情是${mood}（${moodStyles[mood] || "甜蜜温柔"}风格），生成一句${label}问候语，30-50字左右。` },
    ],
    max_tokens: 128,
    temperature: 0.8,
    reasoning_mode: "off",
  });

  const greetingContent = sanitizeContent(
    result.choices?.[0]?.message?.content ?? `${label}，今天也要开心哦`
  );

  return {
    greetingContent,
    voiceScript: {
      timing,
      transcript: greetingContent,
      duration: "0:10",
    },
  };
}