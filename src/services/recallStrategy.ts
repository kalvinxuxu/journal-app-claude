/**
 * Recall strategy — explicit memory recall modes for journal generation.
 *
 * Converts the naive mood-only recall into four distinct strategies:
 * - direct:        Recent same-mood memory → reference specific events
 * - emotional_echo: Older same-mood memory → emotional resonance without specifics
 * - contrasting:   No same-mood memory → contrast technique
 * - no_memory:     Empty memory → pure generation mode
 */

import type { Mood } from "../types/journal";
import type { MemoryEntry, MemoryEngine } from "./generator/index";

export type RecallStrategy = "direct" | "emotional_echo" | "contrasting" | "no_memory";

export type RecallResult = {
  strategy: RecallStrategy;
  entries: MemoryEntry[];
};

const RECENT_DAYS_THRESHOLD = 7;

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(`${dateA}T12:00:00`);
  const b = new Date(`${dateB}T12:00:00`);
  return Math.abs(Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Determine the recall strategy based on existing memory and current date.
 *
 * Strategy selection rules (in order):
 * 1. If no memories at all → no_memory
 * 2. If most recent same-mood memory is within 7 days → direct
 * 3. If same-mood memory exists but older than 7 days → emotional_echo
 * 4. If no same-mood memory → contrasting
 */
export function recallWithStrategy(
  memoryEngine: MemoryEngine,
  mood: Mood,
  currentDate: string,
  limit = 3,
): RecallResult {
  const all = memoryEngine.memories;

  if (all.length === 0) {
    return { strategy: "no_memory", entries: [] };
  }

  // Find same-mood memories sorted by date (most recent first)
  const sameMood = all
    .filter(m => m.mood === mood)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sameMood.length > 0) {
    const mostRecent = sameMood[0];
    const daysSince = daysBetween(mostRecent.date, currentDate);

    if (daysSince <= RECENT_DAYS_THRESHOLD) {
      return {
        strategy: "direct",
        entries: sameMood.slice(0, limit),
      };
    }
    return {
      strategy: "emotional_echo",
      entries: sameMood.slice(0, limit),
    };
  }

  // No same-mood memory → contrasting (use most recent entry regardless of mood)
  const others = [...all].sort((a, b) => b.date.localeCompare(a.date));
  return {
    strategy: "contrasting",
    entries: others.slice(0, limit),
  };
}

/**
 * Build generation prompt context from recall result.
 */
export function buildMemoryContext(result: RecallResult): string {
  if (result.entries.length === 0) return "";

  switch (result.strategy) {
    case "direct":
      return result.entries
        .map(e => `${e.date}写过：${e.summary}`)
        .join(" ");

    case "emotional_echo":
      return result.entries
        .map(e => `有过${e.mood}的心情记忆：${e.summary}`)
        .join(" ");

    case "contrasting": {
      const entry = result.entries[0];
      return `这次心情和${entry.mood}时不同：${entry.summary}`;
    }

    case "no_memory":
    default:
      return "";
  }
}