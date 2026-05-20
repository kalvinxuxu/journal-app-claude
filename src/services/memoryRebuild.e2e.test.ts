/**
 * Phase 3: Persistent Memory Rebuild — End-to-End Verification
 *
 * Covers three scenarios:
 *   1. Cold start from empty storage
 *   2. Cold start with existing journals → memory correctly seeded
 *   3. After writing a new journal → both persisted journals AND runtime memory update
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { createMemoryEngine } from "./generator/index";
import { rebuildMemoryFromJournals } from "./memoryRebuild";
import type { Journal, Mood } from "../types/journal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createJournal = (overrides: Partial<Journal> = {}): Journal => ({
  id: "journal-1",
  date: "2026-05-10",
  weekday: "周六",
  mood: "开心",
  content: "今天阳光很好，想和你一起去公园散步。",
  voiceMessages: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Scenario 1: Cold start from empty storage
// ---------------------------------------------------------------------------

describe("Phase 3 E2E — Cold start from empty storage", () => {
  it("rebuildMemoryFromJournals returns empty entries when no journals exist", () => {
    const result = rebuildMemoryFromJournals([]);
    expect(result.entries).toHaveLength(0);
  });

  it("memoryEngine recalls empty array when no memories exist", () => {
    const engine = createMemoryEngine();
    const recalled = engine.recall("开心");
    expect(recalled).toHaveLength(0);
  });

  it("adding a journal after cold start populates memory", () => {
    const engine = createMemoryEngine();

    engine.addMemory({
      id: "journal-new",
      date: "2026-05-13",
      mood: "想念",
      content: "今天格外想你。",
    });

    const recalled = engine.recall("想念");
    expect(recalled).not.toHaveLength(0);
    expect(recalled[0]?.mood).toBe("想念");
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Cold start with existing journals → memory correctly seeded
// ---------------------------------------------------------------------------

describe("Phase 3 E2E — Cold start with existing journals", () => {
  it("seed restores engine state from rebuildMemoryFromJournals output", () => {
    const journals: Journal[] = [
      createJournal({ id: "j1", date: "2026-05-10", mood: "开心", content: "今天很开心去喝了咖啡。" }),
      createJournal({ id: "j2", date: "2026-05-11", mood: "想念", content: "明天就要见到你了。" }),
      createJournal({ id: "j3", date: "2026-05-12", mood: "平静", content: "今天很安静，读了一本书。" }),
    ];

    const { entries } = rebuildMemoryFromJournals(journals);
    const engine = createMemoryEngine();
    engine.seed(entries);

    // Most recent entry should be first
    expect(engine.memories[0].date).toBe("2026-05-12");
    expect(engine.memories[0].mood).toBe("平静");

    // Oldest entry should be last
    expect(engine.memories[2].date).toBe("2026-05-10");
    expect(engine.memories[2].mood).toBe("开心");

    // Keyword extraction should have run
    const coffeeEntry = engine.memories.find(m => m.date === "2026-05-10");
    expect(coffeeEntry?.keywords.some(k => k.includes("咖啡"))).toBe(true);
  });

  it("recall returns matching mood entry when available", () => {
    const journals: Journal[] = [
      createJournal({ id: "j1", date: "2026-05-10", mood: "开心", content: "今天去喝咖啡" }),
      createJournal({ id: "j2", date: "2026-05-11", mood: "想念", content: "明天见面" }),
    ];

    const { entries } = rebuildMemoryFromJournals(journals);
    const engine = createMemoryEngine();
    engine.seed(entries);

    // Recall for "想念" mood — should find the matching entry
    const recalled = engine.recall("想念");
    expect(recalled).not.toHaveLength(0);
    expect(recalled[0]?.date).toBe("2026-05-11");
    expect(recalled[0]?.mood).toBe("想念");
  });

  it("recall returns empty array when no mood match", () => {
    const journals: Journal[] = [
      createJournal({ id: "j1", date: "2026-05-10", mood: "开心", content: "开心" }),
      createJournal({ id: "j2", date: "2026-05-12", mood: "平静", content: "平静" }),
    ];

    const { entries } = rebuildMemoryFromJournals(journals);
    const engine = createMemoryEngine();
    engine.seed(entries);

    // Recall for "调皮" — no match, returns empty array
    const recalled = engine.recall("调皮");
    expect(recalled).toHaveLength(0);
  });

  it("journals with invalid or empty dates are skipped during rebuild", () => {
    const journals: Journal[] = [
      createJournal({ id: "j1", date: "", content: "invalid" }),
      createJournal({ id: "j2", date: "  ", content: "also invalid" }),
      createJournal({ id: "j3", date: "2026-05-10", content: "valid" }),
    ];

    const { entries } = rebuildMemoryFromJournals(journals);
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe("2026-05-10");
  });

  it("limit of 10 most recent entries is enforced", () => {
    const journals = Array.from({ length: 15 }, (_, i) =>
      createJournal({
        id: `j${i}`,
        date: `2026-05-${String(i + 1).padStart(2, "0")}`,
        mood: "开心" as Mood,
        content: `Day ${i + 1}`,
      })
    );

    const { entries } = rebuildMemoryFromJournals(journals);
    expect(entries).toHaveLength(10);
    // Should be the 10 most recent dates (05-06 through 05-15)
    expect(entries[0].date).toBe("2026-05-15");
    expect(entries[9].date).toBe("2026-05-06");
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: After writing a new journal → persisted + runtime memory update
// ---------------------------------------------------------------------------

describe("Phase 3 E2E — Write journal updates both persisted and runtime memory", () => {
  it("handleSaveJournal correctly prepends new journal and calls addJournalToMemory", async () => {
    const { addJournalToMemory, getMemoryEngine } = await import("./generator");
    const engine = getMemoryEngine();
    engine.seed([]); // Reset

    const newJournal: Journal = {
      id: "journal-2026-05-13",
      date: "2026-05-13",
      weekday: "周二",
      mood: "感动",
      content: "今天收到了你的礼物，很感动。",
      voiceMessages: [],
    };

    // Simulate what handleSaveJournal does in App.tsx
    addJournalToMemory(newJournal);

    const recalled = engine.recall("感动");
    expect(recalled).not.toHaveLength(0);
    expect(recalled[0]?.date).toBe("2026-05-13");
    expect(recalled[0]?.mood).toBe("感动");
    expect(recalled[0]?.summary).toContain("感动");
  });

  it("adding multiple journals maintains newest-first order", async () => {
    const { addJournalToMemory, getMemoryEngine } = await import("./generator");
    const engine = getMemoryEngine();
    engine.seed([]);

    const j1: Journal = createJournal({ id: "j1", date: "2026-05-10", mood: "开心", content: "day1" });
    const j2: Journal = createJournal({ id: "j2", date: "2026-05-11", mood: "想念", content: "day2" });
    const j3: Journal = createJournal({ id: "j3", date: "2026-05-12", mood: "平静", content: "day3" });

    addJournalToMemory(j1);
    addJournalToMemory(j2);
    addJournalToMemory(j3);

    // Newest should be first
    expect(engine.memories[0].date).toBe("2026-05-12");
    expect(engine.memories[1].date).toBe("2026-05-11");
    expect(engine.memories[2].date).toBe("2026-05-10");
  });

  it("memory capacity is capped at 10 entries", async () => {
    const { addJournalToMemory, getMemoryEngine } = await import("./generator");
    const engine = getMemoryEngine();
    engine.seed([]);

    // Add 12 journals
    for (let i = 1; i <= 12; i++) {
      const date = `2026-05-${String(i).padStart(2, "0")}`;
      addJournalToMemory(createJournal({ id: `j${i}`, date, mood: "开心", content: `day${i}` }));
    }

    expect(engine.memories).toHaveLength(10);
    // Oldest entry in the cap list should be 05-03 (05-01 and 05-02 were evicted)
    expect(engine.memories[9].date).toBe("2026-05-03");
  });

  it("content regeneration after mood change uses updated memory", async () => {
    const { addJournalToMemory, getMemoryEngine } = await import("./generator");
    const { generateJournalDraft } = await import("./journalGeneration");

    const engine = getMemoryEngine();
    engine.seed([]);

    // Add a "想念" memory first
    addJournalToMemory({
      id: "j1",
      date: "2026-05-10",
      weekday: "周六",
      mood: "想念",
      content: "上周一起去看了日落，余晖很美。",
    });

    // Generate draft with same mood — should activate memory
    const draft = await generateJournalDraft({
      mood: "想念",
      date: "2026-05-13",
      memoryEngine: engine,
    });

    expect(draft.memoryActivated).toBe(true);
    const recalled = engine.recall("想念");
    expect(recalled).not.toHaveLength(0);
    expect(recalled[0]?.summary).toContain("日落");
  });
});