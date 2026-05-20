import { defaultPreferences, mockJournals } from "../data/mockJournals";
import type { Journal, Preferences, VoiceMessage } from "../types/journal";
import { fetchImageAsBase64, validateImageUrl } from "./api/mediaClient";
import { getBackendUrl } from "./config";

function getApiBase(): string {
  return getBackendUrl();
}

/**
 * Check if a URL is a remote HTTP(S) URL (not a data URL or backend URL).
 */
function isRemoteHttpUrl(url: string): boolean {
  return (url.startsWith("http://") || url.startsWith("https://")) && !url.startsWith(`${getApiBase()}`);
}

/**
 * Check if a URL is a backend media URL.
 */
function isBackendMediaUrl(url: string): boolean {
  return url.startsWith(`${getApiBase()}/media/`) || url.startsWith("/media/");
}

/**
 * Check if a URL is a base64 data URL (legacy audio stored inline).
 */
function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}

function toAbsoluteBackendMediaUrl(url: string): string {
  if (url.startsWith("/media/")) {
    return `${getApiBase()}${url}`;
  }
  return url;
}

function normalizeJournalMediaUrls(journal: Journal): Journal {
  return {
    ...journal,
    images: journal.images?.map(toAbsoluteBackendMediaUrl),
    selfies: journal.selfies?.map(toAbsoluteBackendMediaUrl),
    nightBonusSelfie: journal.nightBonusSelfie ? toAbsoluteBackendMediaUrl(journal.nightBonusSelfie) : journal.nightBonusSelfie,
    referenceImage: journal.referenceImage ? toAbsoluteBackendMediaUrl(journal.referenceImage) : journal.referenceImage,
    voiceMessages: journal.voiceMessages.map((vm) => ({
      ...vm,
      audioUrl: vm.audioUrl ? toAbsoluteBackendMediaUrl(vm.audioUrl) : vm.audioUrl,
    })),
  };
}

/**
 * Migrate legacy remote image URLs to backend storage.
 * Fetches remote images and re-uploads them to the backend.
 * Returns journals with migrated URLs (original URLs kept on failure).
 */
export async function migrateLegacyImageUrls(journals: Journal[]): Promise<Journal[]> {
  const migratedJournals: Journal[] = [];

  for (const journal of journals) {
    let migrated = false;
    const newImages: string[] = [];

    if (journal.images) {
      for (const imageUrl of journal.images) {
        if (isRemoteHttpUrl(imageUrl)) {
          try {
            // Fetch the remote image as base64
            const result = await fetchImageAsBase64(imageUrl);
            if (result.dataUrl) {
              // Upload to backend
              const response = await fetch(`${getApiBase()}/api/media/images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageData: result.dataUrl }),
              });

              if (response.ok) {
                const { url } = (await response.json()) as { url?: string };
                if (url) {
                  newImages.push(toAbsoluteBackendMediaUrl(url));
                  migrated = true;
                  console.log(`[memory] Migrated image: ${imageUrl} -> ${url}`);
                  continue;
                }
              }
            }
          } catch (error) {
            console.warn(`[memory] Failed to migrate image ${imageUrl}:`, error);
          }
          // Fall through: keep original URL on failure
        }
        // Keep URLs that are already data: URLs or backend URLs
        newImages.push(imageUrl);
      }
    }

    migratedJournals.push({
      ...journal,
      images: newImages.length > 0 || !journal.images ? newImages : journal.images,
    });
  }

  return migratedJournals;
}

/**
 * Migrate legacy base64 audio URLs to backend storage.
 * Checks each journal's voiceMessages for data URL audio and uploads to backend.
 * Returns journals with migrated URLs (original URLs kept on failure).
 */
export async function migrateLegacyAudioUrls(journals: Journal[]): Promise<Journal[]> {
  const migratedJournals: Journal[] = [];

  for (const journal of journals) {
    let migrated = false;
    const newVoiceMessages: VoiceMessage[] = [];

    if (journal.voiceMessages) {
      for (const vm of journal.voiceMessages) {
        if (vm.audioUrl && isDataUrl(vm.audioUrl)) {
          try {
            // Upload base64 audio to backend
            const response = await fetch(`${getApiBase()}/api/media/audio`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioData: vm.audioUrl }),
            });

            if (response.ok) {
              const { url } = (await response.json()) as { url?: string };
              if (url) {
                newVoiceMessages.push({ ...vm, audioUrl: toAbsoluteBackendMediaUrl(url) });
                migrated = true;
                console.log(`[memory] Migrated audio: ${vm.audioUrl.slice(0, 50)}... -> ${url}`);
                continue;
              }
            }
          } catch (error) {
            console.warn(`[memory] Failed to migrate audio for journal ${journal.date}:`, error);
          }
          // Fall through: keep original URL on failure
        }
        // Keep URLs that are already backend URLs or non-data URLs
        newVoiceMessages.push(vm);
      }
    }

    migratedJournals.push({
      ...journal,
      voiceMessages: newVoiceMessages.length > 0 ? newVoiceMessages : journal.voiceMessages,
    });
  }

  return migratedJournals;
}

const journalKey = "journal-app:journals";
const preferencesKey = "journal-app:preferences";
const selectedJournalKey = "journal-app:selectedJournalId";
const characterIdKey = "journal-app:characterId";
const referenceImageKey = "journal-app:referenceImage";
const latestSelfieKey = "journal-app:latestSelfie";
const migrationMarkerKey = "journal-app:migrationMarker";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export type JournalLoadResult = {
  journals: Journal[];
  source: "local" | "mock" | "empty";
};

export function loadJournals(): Journal[] {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(journalKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Journal[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(normalizeJournalMediaUrls) : [];
  } catch {
    return [];
  }
}

export function loadJournalsWithSource(): JournalLoadResult {
  if (!canUseStorage()) return { journals: [], source: "empty" };

  const raw = window.localStorage.getItem(journalKey);
  if (!raw) return { journals: [], source: "empty" };

  try {
    const parsed = JSON.parse(raw) as Journal[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { journals: [], source: "empty" };
    }
    return { journals: parsed.map(normalizeJournalMediaUrls), source: "local" };
  } catch {
    return { journals: [], source: "empty" };
  }
}

/**
 * Load all journals from the backend API.
 * Returns empty array on failure (network error, server error, etc.).
 */
export async function loadJournalsFromBackend(): Promise<Journal[]> {
  try {
    const response = await fetch(`${getApiBase()}/api/journals`);
    if (!response.ok) {
      console.warn(`[memory] Backend returned ${response.status}, falling back to localStorage`);
      return [];
    }
    const journals = (await response.json()) as Journal[];
    return journals.map(normalizeJournalMediaUrls);
  } catch (err) {
    console.warn("[memory] Failed to reach backend, falling back to localStorage:", err);
    return [];
  }
}

/**
 * Load journals with backend-first strategy:
 * 1. Try backend first
 * 2. Fall back to localStorage if backend fails
 * 3. Fall back to mock data if localStorage is also empty
 */
export async function loadJournalsWithBackendFallback(): Promise<JournalLoadResult> {
  // Try backend first
  const backendJournals = await loadJournalsFromBackend();
  if (backendJournals.length > 0) {
    // Persist to localStorage for offline use
    if (canUseStorage()) {
      window.localStorage.setItem(journalKey, JSON.stringify(backendJournals));
    }
    return { journals: backendJournals, source: "local" };
  }

  // Fall back to localStorage
  const localResult = loadJournalsWithSource();
  if (localResult.journals.length > 0) {
    return localResult;
  }

  // No data available - return empty state
  return { journals: [], source: "empty" };
}

/**
 * Check if a journal exists on the backend for a given date.
 * Returns true if a journal exists, false otherwise (including network errors).
 */
export async function journalExistsOnBackend(date: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/api/journals`);
    if (!response.ok) {
      return false;
    }
    const journals = (await response.json()) as Journal[];
    return journals.some((j) => j.date === date);
  } catch {
    return false;
  }
}

export function saveJournals(journals: Journal[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(journalKey, JSON.stringify(journals));
}

/**
 * Save a single journal to the backend API.
 * Returns true on success, false on failure.
 * Does NOT update localStorage - caller is responsible for that.
 */
export async function saveJournalToBackend(journal: Journal): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/api/journals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(journal),
    });
    if (!response.ok) {
      console.warn(`[memory] Backend save failed with ${response.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[memory] Failed to save journal to backend:", err);
    return false;
  }
}

export function loadPreferences(): Preferences {
  if (!canUseStorage()) return defaultPreferences;

  const raw = window.localStorage.getItem(preferencesKey);
  if (!raw) return defaultPreferences;

  try {
    return { ...defaultPreferences, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: Preferences) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(preferencesKey, JSON.stringify(preferences));
}

export function loadSelectedJournalId() {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(selectedJournalKey) ?? "";
}

export function saveSelectedJournalId(id: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(selectedJournalKey, id);
}

// Reference image URL for maintaining girlfriend image consistency
export function loadReferenceImage(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(referenceImageKey);
}

export function saveReferenceImage(url: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(referenceImageKey, url);
}

/**
 * Saves reference image as stable base64 data URL.
 * Converts temporary signed URLs to stable storage.
 */
export async function saveReferenceImageAsBase64(url: string): Promise<boolean> {
  if (!canUseStorage()) return false;
  const result = await fetchImageAsBase64(url);
  if (result.dataUrl) {
    window.localStorage.setItem(referenceImageKey, result.dataUrl);
    return true;
  }
  // Fallback: save original URL if conversion fails
  console.warn("[memory] Failed to convert reference image to base64, storing original URL");
  window.localStorage.setItem(referenceImageKey, url);
  return false;
}

/**
 * Loads and validates reference image URL.
 * If stored URL is expired/invalid, attempts to re-fetch as base64.
 * Returns the valid URL to use (either original or base64 conversion).
 */
export async function loadValidReferenceImage(): Promise<string | null> {
  const url = loadReferenceImage();
  if (!url) return null;

  // If it's already a base64 data URL, it's stable
  if (url.startsWith('data:')) return url;

  // Check if signed URL is still valid
  const isValid = await validateImageUrl(url);
  if (isValid) return url;

  // URL expired - try to re-fetch as base64
  console.warn("[memory] Reference image URL expired, attempting to re-fetch");
  const success = await saveReferenceImageAsBase64(url);
  return success ? loadReferenceImage() : null;
}

export function clearReferenceImage() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(referenceImageKey);
}

// Latest generated selfie (separate from stable character reference)
export function loadLatestSelfie(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(latestSelfieKey);
}

export function saveLatestSelfie(url: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(latestSelfieKey, url);
}

/**
 * Migrate localStorage journals to backend storage.
 * Only migrates if:
 * 1. Migration has not already happened (checked via migrationMarker)
 * 2. Backend is empty (don't overwrite existing data)
 * Also runs legacy URL migration (images and audio) on migrated journals.
 * Returns migration results with counts.
 */
export async function migrateLocalStorageJournalsToBackend(): Promise<{
  migrated: number;
  failed: number;
  skipped: number;
}> {
  const result = { migrated: 0, failed: 0, skipped: 0 };

  if (!canUseStorage()) {
    console.warn("[migration] localStorage not available, skipping");
    return { ...result, skipped: result.skipped + 1 };
  }

  // Check if migration already happened
  const marker = window.localStorage.getItem(migrationMarkerKey);
  if (marker === "migrated") {
    console.log("[migration] Already migrated, skipping");
    return { ...result, skipped: result.skipped + 1 };
  }

  // Load local journals
  const localJournals = loadJournals();
  const source = loadJournalsWithSource();

  // Only migrate if localStorage has actual data (not mock)
  if (source.source !== "local" || localJournals.length === 0) {
    console.log("[migration] No local journals to migrate");
    window.localStorage.setItem(migrationMarkerKey, "migrated");
    return { ...result, skipped: result.skipped + 1 };
  }

  // Check if backend already has journals
  const backendJournals = await loadJournalsFromBackend();
  if (backendJournals.length > 0) {
    console.log("[migration] Backend already has journals, skipping migration");
    window.localStorage.setItem(migrationMarkerKey, "migrated");
    return { ...result, skipped: result.skipped + 1 };
  }

  // Build a map of dates already in backend (empty at this point but kept for consistency)
  const backendDates = new Set(backendJournals.map((j) => j.date));

  // Migrate each local journal to backend
  for (const journal of localJournals) {
    if (backendDates.has(journal.date)) {
      // Already exists on backend (shouldn't happen at this point, but defensive)
      result.skipped++;
      continue;
    }

    try {
      // Migrate legacy image URLs
      let processedJournal = await migrateLegacyImageUrls([journal]);
      // Migrate legacy audio URLs
      processedJournal = await migrateLegacyAudioUrls(processedJournal);

      const success = await saveJournalToBackend(processedJournal[0]);
      if (success) {
        result.migrated++;
      } else {
        result.failed++;
      }
    } catch (error) {
      console.warn(`[migration] Failed to migrate journal ${journal.date}:`, error);
      result.failed++;
    }
  }

  // Mark migration as complete
  window.localStorage.setItem(migrationMarkerKey, "migrated");
  console.log(`[migration] Complete: ${result.migrated} migrated, ${result.failed} failed, ${result.skipped} skipped`);

  return result;
}
