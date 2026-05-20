import type { Mood } from "../../types/journal";

export type MemoryEntry = {
  date: string;
  mood: Mood;
  summary: string;
  keywords: string[];
};

export type MemoryEngine = {
  memories: MemoryEntry[];
  addMemory: (journal: { id: string; date: string; mood: Mood; content: string }) => void;
  seed: (entries: MemoryEntry[]) => void;
  recall: (mood: Mood, limit?: number) => MemoryEntry[];
};

function extractKeywords(content: string): string[] {
  const stopWords = ["的", "是", "了", "在", "和", "有", "我", "你", "也", "很", "都", "就", "这", "那"];
  return content
    .split(/[\s,\n。！？]/)
    .filter(w => w.length > 2 && !stopWords.includes(w))
    .slice(0, 5);
}

const MEMORY_KEY = "journal-app:memories";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadMemoriesFromStorage(): MemoryEntry[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(MEMORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MemoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMemoriesToStorage(memories: MemoryEntry[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
}

export function createMemoryEngine(): MemoryEngine {
  let memories: MemoryEntry[] = loadMemoriesFromStorage();

  return {
    get memories() {
      return [...memories];
    },

    addMemory: (journal: { id: string; date: string; mood: Mood; content: string }) => {
      const entry: MemoryEntry = {
        date: journal.date,
        mood: journal.mood,
        summary: journal.content.slice(0, 50) + (journal.content.length > 50 ? "..." : ""),
        keywords: extractKeywords(journal.content),
      };

      memories.unshift(entry);

      if (memories.length > 10) {
        memories = memories.slice(0, 10);
      }

      saveMemoriesToStorage(memories);
    },

    seed: (entries: MemoryEntry[]) => {
      memories = entries.slice(0, 10);
    },

    recall: (mood: Mood, limit = 3): MemoryEntry[] => {
      if (memories.length === 0) return [];

      const sameMood = memories.filter(m => m.mood === mood);
      return sameMood.slice(0, limit);
    },
  };
}