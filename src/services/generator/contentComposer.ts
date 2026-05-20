import type { Mood, Journal } from "../../types/journal";
import type { MoodVariant } from "./moodVariants";
import type { DateFeature } from "./dateProcessor";
import type { MemoryEntry, MemoryEngine } from "./memoryEngine";
import { selectMoodVariant } from "./moodVariants";
import { detectDateFeature } from "./dateProcessor";
import { getOpener, getEnding, getMemoryHook, getDateHint } from "./templates";

export type ComposeParams = {
  mood: Mood;
  date: string;
  memoryEngine: MemoryEngine;
};

export function composeJournal(params: ComposeParams): string {
  const { mood, date, memoryEngine } = params;

  // 1. 选择心情变体
  const variant: MoodVariant = selectMoodVariant(mood);

  // 2. 检测日期特征
  const dateFeature: DateFeature | null = detectDateFeature(date);

  // 3. 尝试召回记忆
  const recalledMemories: MemoryEntry[] = memoryEngine.recall(mood, 3);

  // 4. 组合内容
  const parts: string[] = [];

  // 开头：根据变体 + 日期
  const opener = getOpener(variant);
  const dateHint = getDateHint(dateFeature?.contentHint);
  parts.push(dateHint ? `${opener}\n${dateHint}` : opener);

  // 中间：如果有记忆，插入回忆
  if (recalledMemories.length > 0) {
    parts.push(getMemoryHook());
  }

  // 结尾：根据心情变体
  parts.push(getEnding(mood));

  return parts.join("\n\n");
}