import { describe, expect, it } from "vitest";
import { stripContentPrefix, stripThinkBlocks, sanitizeContent } from "./contentSanitizer.js";

describe("contentSanitizer", () => {
  describe("stripThinkBlocks", () => {
    it("removes think blocks with multi-line content", () => {
      const input = "[[今天心情不错，写一段温暖的话]]\n今天风很轻，很想你。";
      expect(stripThinkBlocks(input)).toBe("今天风很轻，很想你。");
    });

    it("removes multiple think blocks and normalizes newlines", () => {
      const input = "[[模型思考]]\n正文第一行\n[[另一个块]]\n正文第二行";
      expect(stripThinkBlocks(input)).toBe("正文第一行\n正文第二行");
    });

    it("returns original text if no think blocks", () => {
      const input = "今天想你了，很开心。";
      expect(stripThinkBlocks(input)).toBe("今天想你了，很开心。");
    });

    it("handles empty string", () => {
      expect(stripThinkBlocks("")).toBe("");
    });
  });

  describe("stripContentPrefix", () => {
    it("removes 用户希望我 prefix", () => {
      const input = "用户希望我作为AI女友写日记。\n今天风很轻，很想你。";
      expect(stripContentPrefix(input)).toBe("今天风很轻，很想你。");
    });

    it("removes 让我来写 prefix", () => {
      const input = "让我来写：\n早安|起床啦";
      expect(stripContentPrefix(input)).toBe("早安|起床啦");
    });

    it("removes 我来为你写一段日记 prefix", () => {
      const input = "我来为你写一段日记：\n今天阳光正好。";
      expect(stripContentPrefix(input)).toBe("今天阳光正好。");
    });

    it("removes Chinese-quoted instruction prefix", () => {
      const input = "「根据你的要求写日记」\n今天想你了。";
      expect(stripContentPrefix(input)).toBe("今天想你了。");
    });

    it("keeps normal first paragraph", () => {
      const input = "今天风很轻，很想你。\n第二行也很温柔。";
      expect(stripContentPrefix(input)).toBe("今天风很轻，很想你。\n第二行也很温柔。");
    });

    it("handles empty string", () => {
      expect(stripContentPrefix("")).toBe("");
    });

    it("handles single paragraph", () => {
      const input = "今天阳光很好。";
      expect(stripContentPrefix(input)).toBe("今天阳光很好。");
    });

    it("keeps normal paragraphs even if they start with common verbs", () => {
      const input = "帮我写日记\n今天风和日丽\n明天也会很好";
      expect(stripContentPrefix(input)).toBe("帮我写日记\n今天风和日丽\n明天也会很好");
    });
  });

  describe("sanitizeContent", () => {
    it("applies both think block and prefix removal", () => {
      const input = "[[思考内容]]\n用户希望我写日记\n今天风和日丽";
      expect(sanitizeContent(input)).toBe("今天风和日丽");
    });

    it("returns clean content unchanged", () => {
      const input = "今天风和日丽，很想和你散步。";
      expect(sanitizeContent(input)).toBe("今天风和日丽，很想和你散步。");
    });

    it("handles empty string", () => {
      expect(sanitizeContent("")).toBe("");
    });
  });
});