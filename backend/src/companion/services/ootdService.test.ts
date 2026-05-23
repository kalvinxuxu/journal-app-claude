import { describe, it, expect } from "vitest";
import { createOotdGenerator } from "./ootdService";

describe("createOotdGenerator", () => {
  it("generates an OOTD result with expected shape", async () => {
    let capturedPrompt = "";
    let capturedAspectRatio = "";

    const generator = createOotdGenerator({
      port: 3000,
      generateImage: async ({ prompt, aspectRatio }) => {
        capturedPrompt = prompt;
        capturedAspectRatio = aspectRatio;
        return "https://example.com/ootd-generated.jpg";
      },
    });

    const result = await generator("user1", "2026-05-23");

    expect(result.title).toBe("今日穿搭");
    expect(result.caption).toBe("这是她今天想穿的");
    expect(result.imageUrl).toBe("https://example.com/ootd-generated.jpg");
    expect(result.styleTags).toEqual([]);
    expect(result.rationale).toBeNull();
  });

  it("uses 3:4 portrait aspect ratio", async () => {
    let capturedAspectRatio = "";

    const generator = createOotdGenerator({
      port: 3000,
      generateImage: async ({ aspectRatio }) => {
        capturedAspectRatio = aspectRatio;
        return "https://example.com/img.jpg";
      },
    });

    await generator("user1", "2026-05-23");
    expect(capturedAspectRatio).toBe("3:4");
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
    expect(result.caption).toBe("这是她今天想穿的");
    expect(result.imageUrl).toBeNull();
  });
});