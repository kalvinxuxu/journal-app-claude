import fs from "fs/promises";
import path from "path";

// DATA_DIR is the root data directory (e.g., /data in Fly.io container).
// Falls back to process.cwd() for local development.
const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd());
const STORAGE_DIR = path.join(DATA_DIR, "storage");
const JOURNAL_FILE = path.join(STORAGE_DIR, "journals.json");

// ---------------------------------------------------------------------------
// Types (mirrors frontend src/types/journal.ts)
// ---------------------------------------------------------------------------

export type Mood = "开心" | "想念" | "感动" | "平静" | "调皮";

export type VoiceTiming = "morning" | "afternoon" | "night";

export type VoiceMessage = {
  id: string;
  timing: VoiceTiming;
  transcript: string;
  duration: string;
  audioUrl?: string;
};

export type JournalSource = "user" | "girlfriend";

export type JournalStatus = "idle" | "loading" | "ready" | "error";

export type Journal = {
  id: string;
  date: string;
  weekday: string;
  mood: Mood;
  source: JournalSource;
  content: string;
  isDailySummary?: boolean;
  aggregateJournalId?: string;
  entryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  images?: string[];
  selfies?: string[];
  nightBonusSelfie?: string;
  referenceImage?: string;
  voiceMessages: VoiceMessage[];
  voiceStyle?: "soft" | "warm" | "playful";
  ttsStatus?: JournalStatus;
  selfieStatus?: JournalStatus;
  /** User ID for companion system. Defaults to "local-user" if not provided. */
  userId?: string;
};

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function ensureStorageDir(): Promise<void> {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

async function readJournalFile(): Promise<Journal[]> {
  try {
    const raw = await fs.readFile(JOURNAL_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Journal[]) : [];
  } catch {
    // File doesn't exist or is invalid — return empty array
    return [];
  }
}

async function writeJournalFile(journals: Journal[]): Promise<void> {
  await ensureStorageDir();
  await fs.writeFile(JOURNAL_FILE, JSON.stringify(journals, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load all journals from the JSON storage file.
 */
export async function loadJournals(): Promise<Journal[]> {
  return readJournalFile();
}

/**
 * Save (upsert) a single journal. If a journal with the same id exists,
 * it will be replaced; otherwise it will be added.
 */
export async function saveJournal(journal: Journal): Promise<void> {
  const journals = await readJournalFile();
  const index = journals.findIndex((j) => j.id === journal.id);
  if (index >= 0) {
    journals[index] = journal;
  } else {
    journals.push(journal);
  }
  await writeJournalFile(journals);
}

/**
 * Delete a journal by its id.
 */
export async function deleteJournal(id: string): Promise<void> {
  const journals = await readJournalFile();
  const filtered = journals.filter((j) => j.id !== id);
  await writeJournalFile(filtered);
}

/**
 * Delete all journal entries for a given date.
 */
export async function deleteJournalByDate(date: string): Promise<void> {
  const journals = await readJournalFile();
  const filtered = journals.filter((j) => j.date !== date);
  await writeJournalFile(filtered);
}

/**
 * Get a single journal by id. Returns null if not found.
 */
export async function getJournalById(id: string): Promise<Journal | null> {
  const journals = await readJournalFile();
  return journals.find((j) => j.id === id) ?? null;
}

/**
 * Check whether any journal exists for a given date.
 */
export async function journalExists(date: string): Promise<boolean> {
  const journals = await readJournalFile();
  return journals.some((j) => j.date === date);
}

/**
 * Count journals that belong to a specific user.
 * Journals without a userId are treated as belonging to the legacy single-user
 * local profile only when querying for "local-user".
 */
export function countJournalsByUserId(journals: Journal[], userId: string): number {
  return journals.filter((journal) => {
    if (journal.userId) {
      return journal.userId === userId;
    }
    return userId === "local-user";
  }).length;
}