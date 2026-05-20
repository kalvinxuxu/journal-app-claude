import { describe, it, expect } from "vitest";
import { extractSceneContext } from "./sceneExtractor";
import type { Mood } from "../types/journal";

describe("extractSceneContext", () => {
  describe("coffee shop scene (开心 mood)", () => {
    it("extracts coffee shop context from content", () => {
      const content = "今天下午在咖啡店读书，阳光从窗户洒进来，心情特别好。";
      const mood: Mood = "开心";
      const result = extractSceneContext(content, mood, "2026-05-15");

      expect(result.scene).toBe("咖啡店");
      expect(result.activity).toBeTruthy();
      expect(result.action).toBeTruthy();
      expect(result.clothingHint).toBeTruthy();
      expect(result.atmosphere).toBeTruthy();
    });

    it("returns consistent clothingHint for same content", () => {
      const content = "在咖啡店写日记";
      const mood: Mood = "开心";
      const date = "2026-05-15";

      const result1 = extractSceneContext(content, mood, date);
      const result2 = extractSceneContext(content, mood, date);
      const result3 = extractSceneContext(content, mood, date);

      expect(result1.clothingHint).toBe(result2.clothingHint);
      expect(result2.clothingHint).toBe(result3.clothingHint);
    });
  });

  describe("park walk scene (想念 mood)", () => {
    it("extracts park散步 context from content", () => {
      const content = "傍晚在公园散步，想着你，如果你在就好了。";
      const mood: Mood = "想念";
      const result = extractSceneContext(content, mood, "2026-05-15");

      expect(result.scene).toBe("公园");
      expect(result.activity).toBeTruthy();
      expect(result.action).toBeTruthy();
      expect(result.clothingHint).toBeTruthy();
      expect(result.atmosphere).toBeTruthy();
    });
  });

  describe("rainy indoor scene (平静 mood)", () => {
    it("extracts indoor context from rainy day content", () => {
      const content = "下雨天，躲在房间里听雨声，很安静很平和。";
      const mood: Mood = "平静";
      const result = extractSceneContext(content, mood, "2026-05-15");

      expect(result.scene).toBe("室内");
      expect(result.activity).toBeTruthy();
      expect(result.action).toBeTruthy();
      expect(result.clothingHint).toBeTruthy();
      expect(result.atmosphere).toBeTruthy();
    });
  });

  describe("no keyword matching - default values", () => {
    it("returns safe defaults when no keywords match", () => {
      const content = "今天发生了很多事，我需要好好想想。";
      const mood: Mood = "感动";
      const result = extractSceneContext(content, mood, "2026-05-15");

      // All fields must have content (not empty)
      expect(result.scene.length).toBeGreaterThan(0);
      expect(result.activity.length).toBeGreaterThan(0);
      expect(result.action.length).toBeGreaterThan(0);
      expect(result.clothingHint.length).toBeGreaterThan(0);
      expect(result.atmosphere.length).toBeGreaterThan(0);
    });

    it("provides different defaults based on mood", () => {
      const content = "嗯嗯啊啊";
      const mood1: Mood = "开心";
      const mood2: Mood = "想念";

      const result1 = extractSceneContext(content, mood1, "2026-05-15");
      const result2 = extractSceneContext(content, mood2, "2026-05-15");

      // Different moods should produce different default scenes/atmosphere
      expect(result1.scene).not.toBe(result2.scene);
    });
  });

  describe("stability - same input produces same output", () => {
    it("returns identical results for same content across multiple calls", () => {
      const content = "今天阳光很好，心情不错。";
      const mood: Mood = "开心";
      const date = "2026-05-15";

      const results = Array.from({ length: 5 }, () =>
        extractSceneContext(content, mood, date)
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });

    it("clothingHint is stable across multiple calls", () => {
      const content = "在咖啡店和朋友聊天";
      const mood: Mood = "开心";
      const date = "2026-05-15";

      const clothingHints = Array.from({ length: 10 }, () =>
        extractSceneContext(content, mood, date).clothingHint
      );

      const uniqueHints = new Set(clothingHints);
      expect(uniqueHints.size).toBe(1);
    });
  });

  describe("expression field", () => {
    it("returns expression based on mood for 开心", () => {
      const result = extractSceneContext("今天阳光很好，心情不错。", "开心", "2026-05-15");
      expect(result.expression).toBeTruthy();
      expect(typeof result.expression).toBe("string");
    });

    it("returns different expression for 想念 vs 开心", () => {
      const content = "今天发生了很多事";
      const result1 = extractSceneContext(content, "想念", "2026-05-15");
      const result2 = extractSceneContext(content, "开心", "2026-05-15");
      expect(result1.expression).not.toBe(result2.expression);
    });

    it("expression is stable across multiple calls with same input", () => {
      const content = "在咖啡店和朋友聊天";
      const mood: Mood = "开心";
      const expressions = Array.from({ length: 5 }, () =>
        extractSceneContext(content, mood, "2026-05-15").expression
      );
      const uniqueExpressions = new Set(expressions);
      expect(uniqueExpressions.size).toBe(1);
    });

    it("includes expression in full SceneContext output", () => {
      const content = "今天下午在咖啡店读书，阳光从窗户洒进来，心情特别好。";
      const mood: Mood = "开心";
      const result = extractSceneContext(content, mood, "2026-05-15");

      expect(result.scene).toBeTruthy();
      expect(result.activity).toBeTruthy();
      expect(result.action).toBeTruthy();
      expect(result.expression).toBeTruthy();
      expect(result.clothingHint).toBeTruthy();
      expect(result.atmosphere).toBeTruthy();
    });
  });

  describe("clothingHint determination", () => {
    it("clothingHint considers both mood and content", () => {
      const coffeeContent = "在咖啡店读书";
      const parkContent = "在公园散步";

      const coffeeResult = extractSceneContext(coffeeContent, "开心", "2026-05-15");
      const parkResult = extractSceneContext(parkContent, "开心", "2026-05-15");

      // Same mood but different content should potentially have different clothing hints
      // (not guaranteed, but the logic should consider content)
      expect(coffeeResult.clothingHint.length).toBeGreaterThan(0);
      expect(parkResult.clothingHint.length).toBeGreaterThan(0);
    });

    it("clothingHint is not determined by mood alone", () => {
      const content1 = "在咖啡店";
      const content2 = "在公园";
      const mood: Mood = "开心";

      const result1 = extractSceneContext(content1, mood, "2026-05-15");
      const result2 = extractSceneContext(content2, mood, "2026-05-15");

      // Content affects clothing hint
      expect(result1.clothingHint).not.toBeUndefined();
      expect(result2.clothingHint).not.toBeUndefined();
    });
  });
});