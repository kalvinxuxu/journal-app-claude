import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("./api/mediaClient", () => ({
  generateImages: vi.fn(),
  generateSelfies: vi.fn(),
  synthesizeSpeech: vi.fn(),
  fetchImageAsBase64: vi.fn(async () => ({ dataUrl: "data:image/png;base64,SGVsbG8=" })),
}));

import { generateGirlfriendSelfies, synthesizeVoiceMessages, buildJournalMedia, buildJournalImagePrompt } from "./minimax";
import { generateSelfies, synthesizeSpeech, generateImages, fetchImageAsBase64 } from "./api/mediaClient";
import type { Journal } from "../types/journal";

const FIXTURE_JOURNAL: Journal = {
  id: "journal-2026-05-15",
  date: "2026-05-15",
  weekday: "周四",
  mood: "开心",
  source: "user",
  content: "今天下午在咖啡店读书，阳光从窗户洒进来，心情特别好。",
  voiceMessages: [
    { id: "v1", timing: "morning", transcript: "早安！", duration: "0:12" },
  ],
};

describe("minimax service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports TTS error when synthesizeSpeech returns an error payload", async () => {
    vi.mocked(synthesizeSpeech).mockResolvedValue({
      audioDataUrl: null,
      error: "quota exceeded",
    });

    const result = await synthesizeVoiceMessages([
      { id: "v1", timing: "morning", transcript: "hello", duration: "0:10" },
    ]);

    expect(result.error).toContain("quota exceeded");
    expect(result.voiceMessages[0].audioUrl).toBeUndefined();
  });

  it("treats morning selfie success as primary success even if evening fails", async () => {
    vi.mocked(generateSelfies)
      .mockResolvedValueOnce({ selfies: ["http://localhost:3001/media/images/selfie-morning"] })
      .mockResolvedValueOnce({ selfies: [], error: "evening failed" });

    const result = await generateGirlfriendSelfies("开心", "ref-image");

    expect(result.morningSelfie).toMatch(/^http:\/\/localhost:3001\/media\/images\//);
    expect(result.error).toBeUndefined();
    expect(result.eveningWarning).toBe("evening failed");
  });

  // ---- RED: buildJournalImagePrompt includes character description ----

  it("buildJournalImagePrompt includes GIRLFRIEND_DESCRIPTION for character consistency", () => {
    const prompt = buildJournalImagePrompt(FIXTURE_JOURNAL);
    expect(prompt).toContain("Young East Asian woman");
    expect(prompt).toContain("long dark brown to black hair");
  });

  // ---- RED: buildJournalMedia parallel generation returns both images + selfies ----

  it("buildJournalMedia returns both journal images and selfies independently", async () => {
    vi.mocked(generateImages).mockResolvedValue({ urls: ["http://localhost:3001/media/images/journal-img-1", "http://localhost:3001/media/images/journal-img-2"] });
    vi.mocked(synthesizeSpeech).mockResolvedValue({
      audioDataUrl: "data:audio/mp3;base64,abc",
      error: undefined,
    });
    vi.mocked(generateSelfies).mockResolvedValue({
      selfies: ["http://localhost:3001/media/images/selfie-morning"],
      referenceImage: "ref",
    });

    const result = await buildJournalMedia(FIXTURE_JOURNAL, {
      referenceImage: "ref-image-url",
      generateSelfies: true,
    });

    expect(result.journal.images).toHaveLength(2);
    expect(result.journal.images?.[0]).toMatch(/^http:\/\/localhost:3001\/media\/images\//);
    expect(result.selfies?.morningSelfie).toMatch(/^http:\/\/localhost:3001\/media\/images\//);
    expect(result.journal.images).not.toBeUndefined();
    expect(result.selfies?.morningSelfie).not.toBeUndefined();
  });

  it("buildJournalMedia with generateSelfies: false does not call generateSelfies", async () => {
    vi.mocked(generateImages).mockResolvedValue({ urls: ["journal-img"] });
    vi.mocked(synthesizeSpeech).mockResolvedValue({
      audioDataUrl: "data:audio/mp3;base64,abc",
      error: undefined,
    });

    await buildJournalMedia(FIXTURE_JOURNAL, {
      referenceImage: "ref-image-url",
      generateSelfies: false,
    });

    expect(vi.mocked(generateSelfies)).not.toHaveBeenCalled();
  });

  it("buildJournalMedia generates images and voice in parallel", async () => {
    vi.mocked(generateImages).mockResolvedValue({ urls: ["img"] });
    vi.mocked(synthesizeSpeech).mockResolvedValue({
      audioDataUrl: "data:audio/mp3;base64,abc",
      error: undefined,
    });

    await buildJournalMedia(FIXTURE_JOURNAL, { generateSelfies: false });

    // Both should be called (parallel), not sequentially
    expect(vi.mocked(generateImages)).toHaveBeenCalled();
    expect(vi.mocked(synthesizeSpeech)).toHaveBeenCalled();
  });

  // ---- RED: buildJournalImagePrompt is stable for same input ----

  it("buildJournalImagePrompt returns identical string for same journal input", () => {
    const journal = FIXTURE_JOURNAL;
    const prompt1 = buildJournalImagePrompt(journal);
    const prompt2 = buildJournalImagePrompt(journal);
    const prompt3 = buildJournalImagePrompt(journal);

    expect(prompt1).toBe(prompt2);
    expect(prompt2).toBe(prompt3);
  });

  it("buildJournalImagePrompt includes all scene context fields", () => {
    const prompt = buildJournalImagePrompt(FIXTURE_JOURNAL);
    expect(prompt).toContain("Scene:");
    expect(prompt).toContain("Activity:");
    expect(prompt).toContain("Action:");
    expect(prompt).toContain("Expression:");
    expect(prompt).toContain("Clothing:");
    expect(prompt).toContain("Atmosphere:");
  });

  it("buildJournalImagePrompt includes vertical full-body composition guidance", () => {
    const prompt = buildJournalImagePrompt(FIXTURE_JOURNAL);
    expect(prompt).toContain("Vertical portrait composition.");
    expect(prompt).toContain("Full-body framing preferred");
    expect(prompt).toContain("Show the complete outfit");
    expect(prompt).toContain("Only one person in the image");
  });

  it("buildJournalImagePrompt no longer contains random tokens", () => {
    const prompt = buildJournalImagePrompt(FIXTURE_JOURNAL);
    // Should not contain Date.now() or Math.random() patterns
    expect(prompt).not.toMatch(/entry-\d+-[a-z0-9]{6}/);
  });

  // ---- sceneHint tests ----

  it("buildJournalImagePrompt includes sceneHint text when provided", () => {
    const sceneHint = "今天下雨了，想念我们一起撑伞的时候";
    const prompt = buildJournalImagePrompt(FIXTURE_JOURNAL, { sceneHint });
    expect(prompt).toContain(sceneHint);
  });

  it("buildJournalImagePrompt with two different sceneHints produces different prompts", () => {
    const prompt1 = buildJournalImagePrompt(FIXTURE_JOURNAL, {
      sceneHint: "今天下雨了，想念我们一起撑伞的时候",
    });
    const prompt2 = buildJournalImagePrompt(FIXTURE_JOURNAL, {
      sceneHint: "阳光明媚的下午在咖啡店读书",
    });
    expect(prompt1).not.toBe(prompt2);
    // Each should contain its respective sceneHint
    expect(prompt1).toContain("今天下雨了，想念我们一起撑伞的时候");
    expect(prompt2).toContain("阳光明媚的下午在咖啡店读书");
  });

  it("buildJournalImagePrompt falls back to extracted context when no sceneHint provided", () => {
    const prompt = buildJournalImagePrompt(FIXTURE_JOURNAL);
    // Should contain Scene: and not be "user scene:" prefix
    expect(prompt).toContain("Scene:");
    // Should not contain "用户场景：" prefix since no sceneHint
    expect(prompt).not.toContain("用户场景：");
  });

  it("buildJournalImagePrompt scene field uses sceneHint when provided", () => {
    const sceneHint = "咖啡店窗边读书的午后";
    const prompt = buildJournalImagePrompt(FIXTURE_JOURNAL, { sceneHint });
    // The scene field should contain the sceneHint
    expect(prompt).toMatch(/Scene:.*咖啡店窗边读书的午后/);
    // And atmosphere should be prefixed with user scene indicator
    expect(prompt).toMatch(/Atmosphere:.*用户场景：/);
  });

  // ---- RED: generateGirlfriendSelfies passes complete visual hints ----

  it("generateGirlfriendSelfies passes complete visual hints to generateSelfies", async () => {
    vi.mocked(generateSelfies).mockResolvedValue({ selfies: ["url1"] });

    const content = "今天下午在咖啡店读书，心情特别好。";
    await generateGirlfriendSelfies("开心", "ref-image", content, "2026-05-15");

    expect(vi.mocked(generateSelfies)).toHaveBeenCalledTimes(2);
    const firstCall = vi.mocked(generateSelfies).mock.calls[0][0];
    expect(firstCall.visualHints).toBeDefined();
    expect(firstCall.visualHints?.scene).toBeTruthy();
    expect(firstCall.visualHints?.action).toBeTruthy();
    expect(firstCall.visualHints?.expression).toBeTruthy();
    expect(firstCall.visualHints?.clothingHint).toBeTruthy();
    expect(firstCall.visualHints?.atmosphere).toBeTruthy();
  });

  it("generateGirlfriendSelfies works without content (no visual hints)", async () => {
    vi.mocked(generateSelfies).mockResolvedValue({ selfies: ["url1"] });

    await generateGirlfriendSelfies("开心", "ref-image");

    const firstCall = vi.mocked(generateSelfies).mock.calls[0][0];
    expect(firstCall.visualHints).toBeUndefined();
  });

  it("uses the reveal portrait as the default selfie reference when no newer selfie exists", async () => {
    vi.mocked(generateSelfies).mockResolvedValue({ selfies: ["url1"] });

    await generateGirlfriendSelfies("开心", "http://localhost:3001/media/images/reveal-portrait.jpg");

    const firstCall = vi.mocked(generateSelfies).mock.calls[0][0];
    expect(firstCall.referenceImage).toContain("reveal-portrait.jpg");
  });
});

// ============================================================================
// Media file persistence tests
// ============================================================================

describe("persistImageIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads data URL images to backend via POST /api/media/images", async () => {
    vi.mocked(generateImages).mockResolvedValue({
      urls: ["data:image/png;base64,SGVsbG8="],
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "http://localhost:3001/media/images/img-123" }),
    } as Response);

    const { generateMinimaxImages } = await import("./minimax");
    const result = await generateMinimaxImages("a prompt");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/api\/media\/images/);
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(opts.body);
    expect(body.imageData).toBe("data:image/png;base64,SGVsbG8=");
    expect(result).toContain("http://localhost:3001/media/images/img-123");
    fetchMock.mockRestore();
  });

  it("persists remote image URLs to backend instead of keeping signed URLs", async () => {
    vi.mocked(generateImages).mockResolvedValue({
      urls: ["http://example.com/image.png"],
    });

    vi.mocked(fetchImageAsBase64).mockResolvedValueOnce({ dataUrl: "data:image/png;base64,SGVsbG8=" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "/media/images/persisted.png" }),
    } as Response);

    const { generateMinimaxImages } = await import("./minimax");
    const result = await generateMinimaxImages("a prompt");

    expect(fetchImageAsBase64).toHaveBeenCalledWith("http://example.com/image.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("http://localhost:3001/media/images/persisted.png");
  });

  it("returns original URL when upload fails", async () => {
    vi.mocked(generateImages).mockResolvedValue({
      urls: ["data:image/png;base64,FAIL"],
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Upload failed"));

    const { generateMinimaxImages } = await import("./minimax");
    const result = await generateMinimaxImages("a prompt");

    // Should return original data URL on failure
    expect(result).toContain("data:image/png;base64,FAIL");
  });

  it("uploads remote image URLs to backend and stores backend media URL", async () => {
    vi.mocked(generateImages).mockResolvedValue({
      urls: ["https://signed.example.com/image.png?token=abc"],
    });
    vi.mocked(fetchImageAsBase64).mockResolvedValueOnce({ dataUrl: "data:image/png;base64,SGVsbG8=" });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "/media/images/img-remote.png" }),
      } as Response);

    const { generateMinimaxImages } = await import("./minimax");
    const result = await generateMinimaxImages("a prompt");

    expect(fetchImageAsBase64).toHaveBeenCalledWith("https://signed.example.com/image.png?token=abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(["http://localhost:3001/media/images/img-remote.png"]);
    fetchMock.mockRestore();
  });

  it("normalizes relative backend image URLs to absolute URLs", async () => {
    vi.mocked(generateImages).mockResolvedValue({
      urls: ["data:image/png;base64,SGVsbG8="],
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "/media/images/img-relative.png" }),
    } as Response);

    const { generateMinimaxImages } = await import("./minimax");
    const result = await generateMinimaxImages("a prompt");

    expect(result).toContain("http://localhost:3001/media/images/img-relative.png");
  });
});

describe("persistAudioIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads data URL audio to backend via POST /api/media/audio", async () => {
    vi.mocked(synthesizeSpeech).mockResolvedValue({
      audioDataUrl: "data:audio/mp3;base64,QXVkaW8=",
      error: undefined,
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "http://localhost:3001/media/audio/voice-456" }),
    } as Response);

    const { synthesizeVoiceMessages } = await import("./minimax");
    const result = await synthesizeVoiceMessages([
      { id: "v1", timing: "morning", transcript: "早安", duration: "0:12" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/api\/media\/audio/);
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(opts.body);
    expect(body.audioData).toBe("data:audio/mp3;base64,QXVkaW8=");
    // Result should contain the persisted URL
    expect(result.voiceMessages[0].audioUrl).toMatch(/http:\/\/localhost:3001\/media\/audio/);
    fetchMock.mockRestore();
  });

  it("keeps non-data URL audio unchanged", async () => {
    vi.mocked(synthesizeSpeech).mockResolvedValue({
      audioDataUrl: "http://example.com/audio.mp3",
      error: undefined,
    });

    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { synthesizeVoiceMessages } = await import("./minimax");
    const result = await synthesizeVoiceMessages([
      { id: "v1", timing: "morning", transcript: "早安", duration: "0:12" },
    ]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.voiceMessages[0].audioUrl).toBe("http://example.com/audio.mp3");
  });

  it("returns original audio URL when upload fails", async () => {
    vi.mocked(synthesizeSpeech).mockResolvedValue({
      audioDataUrl: "data:audio/mp3;base64,FAIL",
      error: undefined,
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Upload failed"));

    const { synthesizeVoiceMessages } = await import("./minimax");
    const result = await synthesizeVoiceMessages([
      { id: "v1", timing: "morning", transcript: "早安", duration: "0:12" },
    ]);

    // Should return original data URL on failure
    expect(result.voiceMessages[0].audioUrl).toBe("data:audio/mp3;base64,FAIL");
  });
});
