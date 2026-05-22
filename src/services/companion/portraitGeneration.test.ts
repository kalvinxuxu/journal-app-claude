import { describe, expect, it, vi } from "vitest";
import { generateRevealPortrait } from "./portraitGeneration";

vi.stubGlobal("fetch", vi.fn(async () => ({
  ok: true,
  json: async () => ({ images: ["http://localhost:3001/media/images/reveal-portrait.jpg"] }),
})));

describe("generateRevealPortrait", () => {
  it("returns the persisted portrait URL from the image generation API", async () => {
    const url = await generateRevealPortrait("full body portrait, japanese semi-realistic style");
    expect(url).toBe("http://localhost:3001/media/images/reveal-portrait.jpg");
  });
});
