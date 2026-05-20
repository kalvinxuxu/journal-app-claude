import { describe, expect, it, beforeEach, vi } from "vitest";
import { rebuildMemoryFromJournals, type MemoryRebuildResult } from "./memoryRebuild";
import type { Journal } from "../types/journal";

// Mock Date for reproducible tests
const mockDate = new Date("2026-05-13T12:00:00");
vi.setSystemTime(mockDate);

const createJournal = (overrides: Partial<Journal> = {}): Journal => ({
  id: "journal-1",
  date: "2026-05-10",
  weekday: "周六",
  mood: "开心",
  content: "今天阳光很好，想和你一起去散步。",
  voiceMessages: [],
  ...overrides,
});

describe("rebuildMemoryFromJournals", () => {
  it("rebuilds memory entries from persisted journals", () => {
    const journals: Journal[] = [
      createJournal({ id: "j1", date: "2026-05-10", mood: "开心", content: "今天很开心" }),
      createJournal({ id: "j2", date: "2026-05-11", mood: "想念", content: "我想你了" }),
    ];

    const result = rebuildMemoryFromJournals(journals);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].date).toBe("2026-05-11");
    expect(result.entries[0].mood).toBe("想念");
  });

  it("returns empty entries for empty journal list", () => {
    const result = rebuildMemoryFromJournals([]);

    expect(result.entries).toHaveLength(0);
  });

  it("limits to 10 most recent entries", () => {
    const journals = Array.from({ length: 15 }, (_, i) =>
      createJournal({
        id: `j${i}`,
        date: `2026-05-${String(i + 1).padStart(2, "0")}`,
        content: `Day ${i + 1}`,
      })
    );

    const result = rebuildMemoryFromJournals(journals);

    expect(result.entries).toHaveLength(10);
  });

  it("orders entries by date descending (newest first)", () => {
    const journals: Journal[] = [
      createJournal({ id: "j1", date: "2026-05-05", content: "oldest" }),
      createJournal({ id: "j2", date: "2026-05-12", content: "newest" }),
      createJournal({ id: "j3", date: "2026-05-08", content: "middle" }),
    ];

    const result = rebuildMemoryFromJournals(journals);

    expect(result.entries[0].date).toBe("2026-05-12");
    expect(result.entries[1].date).toBe("2026-05-08");
    expect(result.entries[2].date).toBe("2026-05-05");
  });

  it("extracts keywords from journal content", () => {
    const journals: Journal[] = [
      createJournal({ content: "今天天气很好；我们去公园散步；咖啡店喝拿铁" }),
    ];

    const result = rebuildMemoryFromJournals(journals);

    expect(result.entries[0].keywords.some(k => k.includes("咖啡") || k.includes("公园"))).toBe(true);
  });

  it("skips journals without valid dates", () => {
    const journals: Journal[] = [
      createJournal({ date: "", content: "invalid" }),
      createJournal({ date: "2026-05-10", content: "valid" }),
    ];

    const result = rebuildMemoryFromJournals(journals);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].date).toBe("2026-05-10");
  });

  it("seed method restores memory engine state", async () => {
    const { createMemoryEngine } = await import("./generator/memoryEngine");
    const engine = createMemoryEngine();

    expect(engine.memories).toHaveLength(0);

    const entries = [
      { date: "2026-05-10", mood: "开心" as const, summary: "test", keywords: ["咖啡"] },
      { date: "2026-05-11", mood: "想念" as const, summary: "test2", keywords: ["公园"] },
    ];

    engine.seed(entries);

    expect(engine.memories).toHaveLength(2);
    expect(engine.recall("想念")[0]?.date).toBe("2026-05-11");
  });
});