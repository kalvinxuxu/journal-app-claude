import type { Journal, Mood } from "../types/journal";
import type { MemoryEntry } from "./generator/memoryEngine";
import { isDailySummary } from "./journalAggregation";

export type MemoryRebuildResult = {
  entries: MemoryEntry[];
};

/**
 * Rebuilds runtime memory entries from persisted journals.
 * Called once during app bootstrap to restore memory state.
 */
export function rebuildMemoryFromJournals(journals: Journal[]): MemoryRebuildResult {
  if (!journals || journals.length === 0) {
    return { entries: [] };
  }

  const stopWords = ["的", "是", "了", "在", "和", "有", "我", "你", "也", "很", "都", "就", "这", "那"];

  function extractKeywords(content: string): string[] {
    return content
      .split(/[\s,\n。！？]/)
      .filter(w => w.length > 2 && !stopWords.includes(w))
      .slice(0, 5);
  }

  const entries: MemoryEntry[] = journals
    .filter(j => j && j.date && j.date.trim().length > 0 && !isDailySummary(j))
    .map(j => ({
      date: j.date,
      mood: j.mood,
      summary: j.content.slice(0, 50) + (j.content.length > 50 ? "..." : ""),
      keywords: extractKeywords(j.content),
    }))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .slice(0, 10);

  return { entries };
}
