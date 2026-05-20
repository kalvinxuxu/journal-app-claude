/**
 * DeepSeek content generation provider.
 * Uses DeepSeek API for journal and voice script content.
 */

import type { ContentProvider, ContentProviderInput, ContentProviderOutput } from "./contentProvider.js";
import { sanitizeContent } from "../utils/contentSanitizer.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const TIMING_LABELS: Record<string, string> = {
  morning: "早安",
  afternoon: "午后",
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

export class DeepSeekContentProvider implements ContentProvider {
  name(): string {
    return "deepseek";
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
    const sceneContext = input.sceneHint
      ? `\n这次记录的具体场景是：${input.sceneHint}。内容和语音都要紧扣这个场景，不能写成无关的泛化甜蜜日常。`
      : "";

    // Step 1: Generate journal
    const journalResult = await callDeepSeek<{
      choices: Array<{ message: { content: string } }>;
    }>({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是女朋友。直接输出日记正文，用中文写，80字左右，甜蜜温柔。不要输出任何说明、思考过程或格式符号。" },
        { role: "user", content: `今天是${input.date}，心情是${mood}（${moodStyles[mood] || "甜蜜温柔"}风格）。写一段日记。${sceneContext}${memoryContext}` },
      ],
      max_tokens: 512,
      temperature: 0.7,
      reasoning_mode: "off",
    });

    let journalContent = journalResult.choices?.[0]?.message?.content ?? "";
    journalContent = sanitizeContent(journalContent);

    // Step 2: Generate voice scripts
    const voiceResult = await callDeepSeek<{
      choices: Array<{ message: { content: string } }>;
    }>({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是女朋友。直接输出3行文字，每行格式为「时间标签|语音内容」，不许输出其他。时间标签只使用：早安、午后、晚安。每条15-20字。" },
        { role: "user", content: `今天是${input.date}，心情是${mood}。生成3条语音留言：早安、午后、晚安，每条15-20字。${sceneContext}` },
      ],
      max_tokens: 256,
      temperature: 0.7,
      reasoning_mode: "off",
    });

    let rawScripts = voiceResult.choices?.[0]?.message?.content ?? "";
    rawScripts = sanitizeContent(rawScripts);

    const scriptLines = rawScripts.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const timingSet = new Set(Object.values(TIMING_LABELS));
    const parsedScripts: Array<{ label: string; transcript: string }> = [];

    for (const line of scriptLines) {
      if (line.includes("|")) {
        const idx = line.indexOf("|");
        const label = line.slice(0, idx).trim();
        const transcript = line.slice(idx + 1).trim();
        if (timingSet.has(label) && transcript.length > 0) {
          parsedScripts.push({ label, transcript });
          continue;
        }
      }
      for (const label of timingSet) {
        if (line.startsWith(label) && line.length > label.length + 1 && !/^[#*\-+=]/.test(line)) {
          const rest = line.slice(label.length + 1).trim();
          parsedScripts.push({ label, transcript: rest });
          break;
        }
      }
    }

    const allTimings = [
      { timing: "morning" as const, label: "早安" },
      { timing: "afternoon" as const, label: "午后" },
      { timing: "night" as const, label: "晚安" },
    ];

    const outputScripts = allTimings.map(({ timing, label }, i) => {
      const matched = parsedScripts.find((p) => p.label === label);
      return {
        timing,
        transcript: matched?.transcript ?? `${label}，今天也要开心哦`,
        duration: i === 0 ? "0:12" : i === 1 ? "0:15" : "0:18",
      };
    });

    return {
      journalContent: journalContent || "今天也在这里陪着你。",
      voiceScripts: outputScripts,
    };
  }
}

export function createDeepSeekContentProvider(): ContentProvider {
  return new DeepSeekContentProvider();
}
