import fs from "node:fs/promises";
import path from "node:path";
import {
  applyMediaReplacements,
  collectMigratableMedia,
  removeMediaUrls,
  resolveLocalMediaPath,
} from "../src/migration/journalMigration.js";
import type { Journal } from "../src/storage/journalStore.js";

type CliOptions = {
  dryRun: boolean;
  force: boolean;
  remoteOrigin: string;
};

type MigrationSummary = {
  uploadedImages: number;
  uploadedAudio: number;
  missingMedia: number;
  migratedJournals: number;
  skippedJournals: number;
  failedJournals: number;
};

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "storage");
const LOCAL_JOURNALS_FILE = path.join(LOCAL_STORAGE_DIR, "journals.json");

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let force = false;
  let remoteOrigin = process.env.REMOTE_BACKEND_URL ?? "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--remote") {
      remoteOrigin = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
  }

  if (!remoteOrigin) {
    throw new Error("Missing remote backend URL. Use --remote https://<fly-app>.fly.dev");
  }

  return {
    dryRun,
    force,
    remoteOrigin: remoteOrigin.replace(/\/$/, ""),
  };
}

async function loadLocalJournals(): Promise<Journal[]> {
  const raw = await fs.readFile(LOCAL_JOURNALS_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Local journals file is not an array");
  }
  return parsed as Journal[];
}

async function fetchRemoteJournalIds(remoteOrigin: string): Promise<Set<string>> {
  const response = await fetch(`${remoteOrigin}/api/journals`);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote journals: HTTP ${response.status}`);
  }

  const journals = (await response.json()) as Journal[];
  return new Set(journals.map((journal) => journal.id));
}

function getMimeType(filePath: string, kind: "image" | "audio"): string {
  const extension = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
  };

  return map[extension] ?? (kind === "image" ? "image/jpeg" : "audio/mpeg");
}

function toDataUrl(buffer: Buffer, filePath: string, kind: "image" | "audio"): string {
  const mimeType = getMimeType(filePath, kind);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function toAbsoluteRemoteUrl(remoteOrigin: string, returnedUrl: string): string {
  if (returnedUrl.startsWith("http://") || returnedUrl.startsWith("https://")) {
    return returnedUrl;
  }
  return `${remoteOrigin}${returnedUrl.startsWith("/") ? returnedUrl : `/${returnedUrl}`}`;
}

async function uploadMedia(
  remoteOrigin: string,
  kind: "image" | "audio",
  localUrl: string,
): Promise<string> {
  const filePath = resolveLocalMediaPath(localUrl, LOCAL_STORAGE_DIR);
  const fileBuffer = await fs.readFile(filePath);
  const payload = kind === "image"
    ? { imageData: toDataUrl(fileBuffer, filePath, kind) }
    : { audioData: toDataUrl(fileBuffer, filePath, kind) };
  const endpoint = kind === "image" ? "/api/media/images" : "/api/media/audio";

  const response = await fetch(`${remoteOrigin}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload ${kind}: HTTP ${response.status}`);
  }

  const body = await response.json() as { url?: string };
  if (!body.url) {
    throw new Error(`Remote ${kind} upload did not return a url`);
  }

  return toAbsoluteRemoteUrl(remoteOrigin, body.url);
}

async function canReadLocalMedia(localUrl: string): Promise<boolean> {
  try {
    const filePath = resolveLocalMediaPath(localUrl, LOCAL_STORAGE_DIR);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function saveRemoteJournal(remoteOrigin: string, journal: Journal): Promise<void> {
  const response = await fetch(`${remoteOrigin}/api/journals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(journal),
  });

  if (!response.ok) {
    throw new Error(`Failed to save journal ${journal.id}: HTTP ${response.status}`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const journals = await loadLocalJournals();
  const remoteJournalIds = options.dryRun || options.force
    ? new Set<string>()
    : await fetchRemoteJournalIds(options.remoteOrigin);
  const uploadedMedia = new Map<string, string>();
  const summary: MigrationSummary = {
    uploadedImages: 0,
    uploadedAudio: 0,
    missingMedia: 0,
    migratedJournals: 0,
    skippedJournals: 0,
    failedJournals: 0,
  };

  console.log(`[migrate] Loaded ${journals.length} local journals from ${LOCAL_JOURNALS_FILE}`);
  if (options.dryRun) {
    console.log("[migrate] Dry run mode enabled; no uploads or remote writes will happen.");
  }

  for (const journal of journals) {
    if (!options.force && remoteJournalIds.has(journal.id)) {
      summary.skippedJournals += 1;
      console.log(`[skip] ${journal.id} already exists on remote`);
      continue;
    }

    const mediaReferences = collectMigratableMedia(journal, options.remoteOrigin);
    const uniqueMedia = [...new Map(mediaReferences.map((reference) => [reference.url, reference])).values()];

    if (options.dryRun) {
      console.log(`[dry-run] ${journal.id}: ${uniqueMedia.length} media file(s), ${journal.voiceMessages.length} voice message(s)`);
      summary.migratedJournals += 1;
      continue;
    }

    try {
      const replacements: Record<string, string> = {};
      const missingMediaUrls = new Set<string>();

      for (const media of uniqueMedia) {
        const cached = uploadedMedia.get(media.url);
        if (cached) {
          replacements[media.url] = cached;
          continue;
        }

        if (!(await canReadLocalMedia(media.url))) {
          missingMediaUrls.add(media.url);
          summary.missingMedia += 1;
          console.warn(`[missing] ${journal.id}: ${media.url}`);
          continue;
        }

        const remoteUrl = await uploadMedia(options.remoteOrigin, media.kind, media.url);
        uploadedMedia.set(media.url, remoteUrl);
        replacements[media.url] = remoteUrl;
        if (media.kind === "image") {
          summary.uploadedImages += 1;
        } else {
          summary.uploadedAudio += 1;
        }
      }

      const migratedJournal = applyMediaReplacements(
        removeMediaUrls(journal, missingMediaUrls),
        replacements,
      );
      await saveRemoteJournal(options.remoteOrigin, migratedJournal);
      summary.migratedJournals += 1;
      console.log(`[ok] ${journal.id} migrated`);
    } catch (error) {
      summary.failedJournals += 1;
      console.error(`[fail] ${journal.id}:`, error);
    }
  }

  console.log("[summary]", summary);
  if (summary.failedJournals > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[fatal]", error);
  process.exitCode = 1;
});
