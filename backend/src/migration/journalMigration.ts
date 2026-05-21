import path from "node:path";
import type { Journal } from "../storage/journalStore.js";

export type MediaKind = "image" | "audio";

export type MediaReference = {
  kind: MediaKind;
  url: string;
};

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getMediaKind(url: string): MediaKind | null {
  if (url.includes("/media/images/")) {
    return "image";
  }
  if (url.includes("/media/audio/")) {
    return "audio";
  }
  return null;
}

function shouldMigrateMediaUrl(url: string, remoteOrigin: string): boolean {
  const kind = getMediaKind(url);
  if (!kind) {
    return false;
  }

  if (url.startsWith("/media/")) {
    return true;
  }

  const parsed = tryParseUrl(url);
  if (!parsed) {
    return false;
  }

  if (normalizeOrigin(parsed.origin) === normalizeOrigin(remoteOrigin)) {
    return false;
  }

  return isLocalHost(parsed.hostname);
}

export function collectMigratableMedia(journal: Journal, remoteOrigin: string): MediaReference[] {
  const urls: MediaReference[] = [];

  for (const imageUrl of journal.images ?? []) {
    if (shouldMigrateMediaUrl(imageUrl, remoteOrigin)) {
      urls.push({ kind: "image", url: imageUrl });
    }
  }

  for (const selfieUrl of journal.selfies ?? []) {
    if (shouldMigrateMediaUrl(selfieUrl, remoteOrigin)) {
      urls.push({ kind: "image", url: selfieUrl });
    }
  }

  for (const imageUrl of [journal.nightBonusSelfie, journal.referenceImage]) {
    if (imageUrl && shouldMigrateMediaUrl(imageUrl, remoteOrigin)) {
      urls.push({ kind: "image", url: imageUrl });
    }
  }

  for (const voiceMessage of journal.voiceMessages) {
    if (voiceMessage.audioUrl && shouldMigrateMediaUrl(voiceMessage.audioUrl, remoteOrigin)) {
      urls.push({ kind: "audio", url: voiceMessage.audioUrl });
    }
  }

  return urls;
}

function replaceUrl(url: string | undefined, replacements: Record<string, string>): string | undefined {
  if (!url) {
    return url;
  }
  return replacements[url] ?? url;
}

export function applyMediaReplacements(journal: Journal, replacements: Record<string, string>): Journal {
  return {
    ...journal,
    images: journal.images?.map((url) => replacements[url] ?? url),
    selfies: journal.selfies?.map((url) => replacements[url] ?? url),
    nightBonusSelfie: replaceUrl(journal.nightBonusSelfie, replacements),
    referenceImage: replaceUrl(journal.referenceImage, replacements),
    voiceMessages: journal.voiceMessages.map((voiceMessage) => ({
      ...voiceMessage,
      audioUrl: replaceUrl(voiceMessage.audioUrl, replacements),
    })),
  };
}

export function removeMediaUrls(journal: Journal, urlsToRemove: Set<string>): Journal {
  return {
    ...journal,
    images: journal.images?.filter((url) => !urlsToRemove.has(url)),
    selfies: journal.selfies?.filter((url) => !urlsToRemove.has(url)),
    nightBonusSelfie: journal.nightBonusSelfie && !urlsToRemove.has(journal.nightBonusSelfie)
      ? journal.nightBonusSelfie
      : undefined,
    referenceImage: journal.referenceImage && !urlsToRemove.has(journal.referenceImage)
      ? journal.referenceImage
      : undefined,
    voiceMessages: journal.voiceMessages.map((voiceMessage) => ({
      ...voiceMessage,
      audioUrl: voiceMessage.audioUrl && !urlsToRemove.has(voiceMessage.audioUrl)
        ? voiceMessage.audioUrl
        : undefined,
    })),
  };
}

export function resolveLocalMediaPath(url: string, storageDir: string): string {
  const normalized = url.startsWith("/media/")
    ? url
    : (() => {
        const parsed = tryParseUrl(url);
        return parsed?.pathname ?? "";
      })();

  if (normalized.startsWith("/media/images/")) {
    return path.join(storageDir, "images", path.basename(normalized));
  }

  if (normalized.startsWith("/media/audio/")) {
    return path.join(storageDir, "audio", path.basename(normalized));
  }

  throw new Error(`Unsupported local media url: ${url}`);
}
