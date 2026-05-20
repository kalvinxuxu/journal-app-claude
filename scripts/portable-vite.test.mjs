import { describe, expect, it } from "vitest";
import { pickDriveLetter } from "./portable-vite-core.mjs";

describe("pickDriveLetter", () => {
  it("returns the first available candidate", () => {
    const used = new Set(["X", "Y"]);
    expect(pickDriveLetter(used, ["X", "Y", "Z"])).toBe("Z");
  });

  it("returns null when all candidates are used", () => {
    const used = new Set(["X", "Y", "Z"]);
    expect(pickDriveLetter(used, ["X", "Y", "Z"])).toBeNull();
  });
});
