import { describe, it, expect } from "vitest";
import { polishContent, type PolishResult } from "./contentPolish";

describe("Content Polish — Modification Log", () => {
  describe("Sensitive content", () => {
    it("logs replacement when sensitive word is found in journal", () => {
      const result = polishContent(
        "今天去赌场输了很多钱，心情很差。",
        [],
      );
      const sensitiveMod = result.modifications.find(m => m.rule === "sensitive");
      expect(sensitiveMod).toBeDefined();
      expect(sensitiveMod?.action).toBe("replaced");
      expect(sensitiveMod?.before).toContain("赌场");
    });

    it("logs replacement when sensitive word is found in voice script", () => {
      const result = polishContent(
        "今天阳光很好，下午和闺蜜去逛街，很开心。",
        [{ timing: "morning", transcript: "早起去吸毒了回来感觉很累", duration: "5s" }],
      );
      const sensitiveMod = result.modifications.find(m => m.path === "voice[0]");
      expect(sensitiveMod).toBeDefined();
      expect(sensitiveMod?.action).toBe("replaced");
    });
  });

  describe("Length constraints", () => {
    it("logs truncation when journal exceeds 200 chars", () => {
      const longContent = "今天发生了很多很多事情。".repeat(20); // > 200 chars
      const result = polishContent(longContent, []);
      const lengthMod = result.modifications.find(m => m.rule === "length");
      expect(lengthMod?.action).toBe("truncated");
      expect(result.journal.length).toBeLessThanOrEqual(200);
    });

    it("logs rejection when journal is too short (< 30 chars)", () => {
      const result = polishContent("OK", []);  // 2 chars — well under 30
      expect(result.blocked).toBe(true);
      const lengthMod = result.modifications.find(m => m.rule === "length");
      expect(lengthMod?.action).toBe("rejected");
    });

    it("logs truncation when voice script exceeds 20 chars", () => {
      const result = polishContent(
        "今天阳光很好，下午和闺蜜去逛街，很开心。",
        [{ timing: "morning", transcript: "早安呀今天天气真的很好很好很好很好呀很呀好", duration: "5s" }],
      );
      const voiceMod = result.modifications.find(m => m.path === "voice[0]");
      expect(voiceMod?.action).toBe("truncated");
      expect(voiceMod?.after.length).toBeLessThanOrEqual(20);
    });
  });

  describe("Tone boundaries", () => {
    it("does NOT modify content for clingy tone — only logs warning", () => {
      const result = polishContent(
        "我每分每秒都在想你，没有你我真的活不下去。",
        [],
      );
      const toneMod = result.modifications.find(m => m.rule === "tone");
      expect(toneMod?.action).toBe("passed"); // flagged but not modified
    });

    it("does NOT modify content for preachy tone — only logs warning", () => {
      const result = polishContent(
        "你应该好好休息，听话。",
        [],
      );
      const toneMod = result.modifications.find(m => m.rule === "tone");
      expect(toneMod?.action).toBe("passed");
    });

    it("rejects journal if BOTH clingy and preachy detected", () => {
      const result = polishContent(
        "你应该每分每秒都想我，我离不开你，你要记住。",
        [],
      );
      expect(result.blocked).toBe(true);
    });
  });

  describe("Clean content", () => {
    it("passes through clean journal with no modifications", () => {
      const result = polishContent(
        "今天阳光很好，下午和闺蜜去逛街，买了件新裙子，很开心。",
        [{ timing: "morning", transcript: "早安呀今天天气不错", duration: "5s" }],
      );
      expect(result.modifications).toHaveLength(0);
      expect(result.blocked).toBe(false);
    });
  });
});