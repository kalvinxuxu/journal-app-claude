import { describe, expect, it } from "vitest";
import { buildPhotoWallItems } from "./photoWall";

describe("buildPhotoWallItems", () => {
  it("collects images, selfies, and night bonus photos from journals", () => {
    const items = buildPhotoWallItems([
      {
        id: "j1",
        date: "2026-05-20",
        weekday: "周三",
        mood: "开心",
        source: "girlfriend" as const,
        content: "test",
        voiceMessages: [],
        images: ["img-1"],
        selfies: ["selfie-1"],
        nightBonusSelfie: "night-1",
      },
    ]);

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.kind)).toEqual(["image", "selfie", "nightBonus"]);
  });
});