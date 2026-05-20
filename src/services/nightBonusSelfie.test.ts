import { describe, expect, it } from "vitest";
import { shouldGenerateNightBonus, buildNightBonusPrompt } from "./nightBonusSelfie";

describe("nightBonusSelfie", () => {
  describe("shouldGenerateNightBonus", () => {
    it("returns true at 21:00 with no existing night bonus", () => {
      expect(shouldGenerateNightBonus({ hour: 21, hasNightBonusSelfie: false })).toBe(true);
    });

    it("returns true at 22:00 with no existing night bonus", () => {
      expect(shouldGenerateNightBonus({ hour: 22, hasNightBonusSelfie: false })).toBe(true);
    });

    it("returns true at 23:00 with no existing night bonus", () => {
      expect(shouldGenerateNightBonus({ hour: 23, hasNightBonusSelfie: false })).toBe(true);
    });

    it("returns false at 15:00 (afternoon)", () => {
      expect(shouldGenerateNightBonus({ hour: 15, hasNightBonusSelfie: false })).toBe(false);
    });

    it("returns false at 20:00 (before 21:00)", () => {
      expect(shouldGenerateNightBonus({ hour: 20, hasNightBonusSelfie: false })).toBe(false);
    });

    it("returns false when night bonus already exists", () => {
      expect(shouldGenerateNightBonus({ hour: 22, hasNightBonusSelfie: true })).toBe(false);
    });

    it("returns false at 21:00 when night bonus already exists", () => {
      expect(shouldGenerateNightBonus({ hour: 21, hasNightBonusSelfie: true })).toBe(false);
    });

    it("returns false at 9:00 (morning)", () => {
      expect(shouldGenerateNightBonus({ hour: 9, hasNightBonusSelfie: false })).toBe(false);
    });
  });

  describe("buildNightBonusPrompt", () => {
    it("includes mood in the prompt", () => {
      const prompt = buildNightBonusPrompt("开心");
      expect(prompt).toContain("开心");
    });

    it("includes sleepwear and sweet keywords", () => {
      const prompt = buildNightBonusPrompt("想念");
      expect(prompt).toContain("睡衣自拍");
      expect(prompt).toContain("甜心感");
    });

    it("generates different prompts for different moods", () => {
      const happyPrompt = buildNightBonusPrompt("开心");
      const missPrompt = buildNightBonusPrompt("想念");

      expect(happyPrompt).not.toBe(missPrompt);
    });
  });
});