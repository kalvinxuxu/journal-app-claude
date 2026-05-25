import { describe, it, expect } from "vitest";
import { createOotdGenerator } from "./ootdService";
import type { OotdCardKind, OotdCard } from "../types";

describe("createOotdGenerator", () => {
  it("generates an OOTD result with expected shape", async () => {
    const capturedPrompts: string[] = [];
    let capturedAspectRatio = "";

    const generator = createOotdGenerator({
      port: 3000,
      generateImage: async ({ prompt, aspectRatio }) => {
        capturedPrompts.push(prompt);
        capturedAspectRatio = aspectRatio;
        return "https://example.com/ootd-generated.jpg";
      },
    });

    const result = await generator("user1", "2026-05-23", undefined, "stylish_refined");

    expect(result.title).toBe("今日穿搭");
    expect(result.caption).toBe("她知道怎么把自己穿得更好看。");
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].imageUrl).toBe("https://example.com/ootd-generated.jpg");
    expect(result.cards[1].imageUrl).toBe("https://example.com/ootd-generated.jpg");
    expect(result.styleTags).toEqual(["精致穿搭", "时尚感", "养眼"]);
    expect(result.rationale).toBeNull();
    // First prompt should be fullbody selfie
    expect(capturedPrompts[0]).toContain("Only one young woman");
    expect(capturedPrompts[0]).toContain("mirror selfie");
    expect(capturedPrompts[0]).toContain("Xiaohongshu fashion blogger");
    expect(capturedPrompts[0]).toContain("Her styling aura should feel refined, fashion-forward, polished styling");
    // Second prompt should be makeup closeup
    expect(capturedPrompts[1]).toContain("makeup close-up selfie");
  });

  it("uses 9:16 portrait aspect ratio", async () => {
    let capturedAspectRatio = "";

    const generator = createOotdGenerator({
      port: 3000,
      generateImage: async ({ aspectRatio }) => {
        capturedAspectRatio = aspectRatio;
        return "https://example.com/img.jpg";
      },
    });

    await generator("user1", "2026-05-23");
    expect(capturedAspectRatio).toBe("9:16");
  });

  it("handles image generation failure gracefully", async () => {
    const generator = createOotdGenerator({
      port: 3000,
      generateImage: async () => {
        throw new Error("Image generation failed");
      },
    });

    const result = await generator("user1", "2026-05-23");

    expect(result.title).toBe("今日穿搭");
    expect(result.caption).toBe("她知道怎么把自己穿得更好看。");
    expect(result.cards[0].imageUrl).toBeNull();
    expect(result.cards[1].imageUrl).toBeNull();
  });

  it("forwards subjectReference when provided", async () => {
    let capturedSubjectReference: string | undefined;

    const generator = createOotdGenerator({
      port: 3000,
      generateImage: async ({ subjectReference }) => {
        capturedSubjectReference = subjectReference;
        return "https://example.com/img.jpg";
      },
    });

    await generator("user1", "2026-05-23", "https://example.com/reveal-portrait.jpg");

    expect(capturedSubjectReference).toBe("https://example.com/reveal-portrait.jpg");
  });

  it("returns full-body and makeup selfie cards with constrained prompt direction", async () => {
    const prompts: string[] = [];
    const generator = createOotdGenerator({
      port: 3001,
      generateImage: async ({ prompt }) => {
        prompts.push(prompt);
        return `https://example.com/${prompts.length}.jpg`;
      },
    });

    const result = await generator("user-1", "2026-05-25", "https://example.com/ref.jpg", "old_money");

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].kind).toBe("fullbody_selfie");
    expect(result.cards[1].kind).toBe("makeup_closeup");
    expect(prompts[0]).toContain("mirror selfie");
    expect(prompts[0]).toContain("cute, sexy, or elegant");
    expect(prompts[1]).toContain("makeup close-up selfie");
    expect(prompts[1]).toContain("same girl and same outfit continuity");
  });
});
