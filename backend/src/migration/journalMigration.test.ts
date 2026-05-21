import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Journal } from "../storage/journalStore.js";
import {
  applyMediaReplacements,
  collectMigratableMedia,
  removeMediaUrls,
  resolveLocalMediaPath,
} from "./journalMigration.js";

function buildJournal(overrides: Partial<Journal> = {}): Journal {
  return {
    id: "journal-1",
    date: "2026-05-20",
    weekday: "周三",
    mood: "开心",
    source: "girlfriend",
    content: "content",
    voiceMessages: [],
    ...overrides,
  };
}

describe("journalMigration", () => {
  it("collects only local media urls that still need remote upload", () => {
    const journal = buildJournal({
      images: [
        "/media/images/local-image.jpg",
        "http://localhost:3001/media/images/local-absolute.jpg",
        "https://journal-api-shy-pebble-9077.fly.dev/media/images/already-remote.jpg",
      ],
      selfies: ["http://127.0.0.1:3001/media/images/selfie.jpg"],
      nightBonusSelfie: "https://example.com/not-our-media.jpg",
      referenceImage: "/media/images/reference.png",
      voiceMessages: [
        {
          id: "voice-1",
          timing: "morning",
          transcript: "hi",
          duration: "00:05",
          audioUrl: "/media/audio/voice.mp3",
        },
      ],
    });

    expect(collectMigratableMedia(journal, "https://journal-api-shy-pebble-9077.fly.dev")).toEqual([
      { kind: "image", url: "/media/images/local-image.jpg" },
      { kind: "image", url: "http://localhost:3001/media/images/local-absolute.jpg" },
      { kind: "image", url: "http://127.0.0.1:3001/media/images/selfie.jpg" },
      { kind: "image", url: "/media/images/reference.png" },
      { kind: "audio", url: "/media/audio/voice.mp3" },
    ]);
  });

  it("replaces media urls across journal fields", () => {
    const journal = buildJournal({
      images: ["/media/images/local-image.jpg"],
      selfies: ["http://localhost:3001/media/images/selfie.jpg"],
      nightBonusSelfie: "/media/images/night.jpg",
      referenceImage: "/media/images/reference.png",
      voiceMessages: [
        {
          id: "voice-1",
          timing: "night",
          transcript: "good night",
          duration: "00:06",
          audioUrl: "/media/audio/voice.mp3",
        },
      ],
    });

    const migrated = applyMediaReplacements(journal, {
      "/media/images/local-image.jpg": "https://remote/media/images/local-image.jpg",
      "http://localhost:3001/media/images/selfie.jpg": "https://remote/media/images/selfie.jpg",
      "/media/images/night.jpg": "https://remote/media/images/night.jpg",
      "/media/images/reference.png": "https://remote/media/images/reference.png",
      "/media/audio/voice.mp3": "https://remote/media/audio/voice.mp3",
    });

    expect(migrated.images).toEqual(["https://remote/media/images/local-image.jpg"]);
    expect(migrated.selfies).toEqual(["https://remote/media/images/selfie.jpg"]);
    expect(migrated.nightBonusSelfie).toBe("https://remote/media/images/night.jpg");
    expect(migrated.referenceImage).toBe("https://remote/media/images/reference.png");
    expect(migrated.voiceMessages[0].audioUrl).toBe("https://remote/media/audio/voice.mp3");
  });

  it("removes missing media urls across journal fields", () => {
    const journal = buildJournal({
      images: ["/media/images/keep.jpg", "/media/images/missing.jpg"],
      selfies: ["http://localhost:3001/media/images/missing-selfie.jpg"],
      nightBonusSelfie: "/media/images/night-missing.jpg",
      referenceImage: "/media/images/reference-keep.png",
      voiceMessages: [
        {
          id: "voice-1",
          timing: "night",
          transcript: "good night",
          duration: "00:06",
          audioUrl: "/media/audio/missing.mp3",
        },
        {
          id: "voice-2",
          timing: "morning",
          transcript: "morning",
          duration: "00:07",
          audioUrl: "/media/audio/keep.mp3",
        },
      ],
    });

    const migrated = removeMediaUrls(journal, new Set([
      "/media/images/missing.jpg",
      "http://localhost:3001/media/images/missing-selfie.jpg",
      "/media/images/night-missing.jpg",
      "/media/audio/missing.mp3",
    ]));

    expect(migrated.images).toEqual(["/media/images/keep.jpg"]);
    expect(migrated.selfies).toEqual([]);
    expect(migrated.nightBonusSelfie).toBeUndefined();
    expect(migrated.referenceImage).toBe("/media/images/reference-keep.png");
    expect(migrated.voiceMessages[0].audioUrl).toBeUndefined();
    expect(migrated.voiceMessages[1].audioUrl).toBe("/media/audio/keep.mp3");
  });

  it("resolves local storage paths for image and audio urls", () => {
    const storageDir = "C:\\data\\storage";

    expect(resolveLocalMediaPath("/media/images/local-image.jpg", storageDir)).toBe(
      path.join(storageDir, "images", "local-image.jpg"),
    );
    expect(resolveLocalMediaPath("http://localhost:3001/media/audio/voice.mp3", storageDir)).toBe(
      path.join(storageDir, "audio", "voice.mp3"),
    );
    expect(() => resolveLocalMediaPath("https://example.com/file.jpg", storageDir)).toThrow(
      "Unsupported local media url",
    );
  });
});
