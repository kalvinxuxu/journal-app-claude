import { describe, expect, it } from "vitest";
import { createMemoryExtractionService } from "./memoryExtractionService";

describe("createMemoryExtractionService", () => {
  it("extracts specific, personal, recallable details from a journal entry", () => {
    const service = createMemoryExtractionService();

    const items = service.extractFromJournal({
      userId: "usr_1",
      journalId: "jr_1",
      content: "今天开会被老板点名，我一路坐地铁发呆。其实我很怕别人觉得我麻烦，下雨天也会让我特别想躲起来。",
    });

    expect(items.length).toBe(3);
    expect(items.some((item) => item.summary.includes("老板点名"))).toBe(true);
    expect(items.some((item) => item.summary.includes("怕别人觉得我麻烦"))).toBe(true);
    expect(items.some((item) => item.summary.includes("下雨天"))).toBe(true);
  });
});