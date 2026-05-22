import { describe, expect, it } from "vitest";
import { createMemoryRecallService } from "./memoryRecallService";

describe("createMemoryRecallService", () => {
  it("returns the most recallable memories for the next journal context", () => {
    const service = createMemoryRecallService();

    const result = service.selectForJournal([
      { summary: "下雨天容易想躲起来", recallScore: 82, salienceScore: 78, memoryType: "preference" },
      { summary: "害怕被别人觉得麻烦", recallScore: 90, salienceScore: 95, memoryType: "fear" },
      { summary: "喜欢成熟温柔的靠近方式", recallScore: 72, salienceScore: 66, memoryType: "preference" },
    ]);

    expect(result[0]?.summary).toBe("害怕被别人觉得麻烦");
    expect(result).toHaveLength(3);
  });
});