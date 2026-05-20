import { describe, it, expect } from "vitest";
import { selectMoodVariant } from "./moodVariants";
import { detectDateFeature } from "./dateProcessor";
import { createMemoryEngine } from "./memoryEngine";
import { composeJournal } from "./contentComposer";
import type { Mood } from "../types/journal";

describe("Generator System", () => {
  describe("moodVariants", () => {
    it("returns a variant for each mood", () => {
      const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];
      moods.forEach((mood) => {
        const variant = selectMoodVariant(mood);
        expect(variant).toBeDefined();
        expect(variant.tag).toBeTruthy();
      });
    });

    it("returns variant with weight property", () => {
      const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];
      moods.forEach((mood) => {
        const variant = selectMoodVariant(mood);
        expect(typeof variant.weight).toBe("number");
      });
    });
  });

  describe("dateProcessor", () => {
    it("detects weekday correctly", () => {
      const monday = detectDateFeature("2026-05-04"); // 周一
      expect(monday?.type).toBe("weekday");
    });

    it("detects weekend correctly", () => {
      const sunday = detectDateFeature("2026-05-03"); // 周日
      expect(sunday?.type).toBe("weekend");
    });

    it("returns null for regular weekday", () => {
      const regular = detectDateFeature("2026-05-06"); // 周三
      expect(regular).toBeNull();
    });
  });

  describe("memoryEngine", () => {
    it("starts with empty memories", () => {
      const engine = createMemoryEngine();
      expect(engine.recall("开心")).toHaveLength(0);
    });

    it("stores and recalls memories", () => {
      const engine = createMemoryEngine();

      engine.addMemory({
        id: "test-1",
        date: "2026-05-01",
        weekday: "周四",
        mood: "开心",
        content: "今天阳光特别好，想和你去公园散步。",
        voiceMessages: [],
      });

      const recalled = engine.recall("开心");
      expect(recalled).not.toHaveLength(0);
      expect(recalled[0]?.mood).toBe("开心");
    });

    it("prefers same mood when recalling", () => {
      const engine = createMemoryEngine();

      engine.addMemory({
        id: "test-1",
        date: "2026-05-01",
        weekday: "周四",
        mood: "想念",
        content: "今天特别想你。",
        voiceMessages: [],
      });

      engine.addMemory({
        id: "test-2",
        date: "2026-05-02",
        weekday: "周五",
        mood: "开心",
        content: "今天很开心。",
        voiceMessages: [],
      });

      const recalled = engine.recall("开心");
      expect(recalled[0]?.mood).toBe("开心");
    });
  });

  describe("contentComposer", () => {
    it("composes journal content without errors", () => {
      const engine = createMemoryEngine();
      const content = composeJournal({ mood: "开心", date: "2026-05-11", memoryEngine: engine });
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(10);
    });

    it("returns string with multiple paragraphs", () => {
      const engine = createMemoryEngine();
      const content = composeJournal({ mood: "想念", date: "2026-05-11", memoryEngine: engine });
      expect(content.includes("\n\n")).toBeTruthy();
    });
  });
});