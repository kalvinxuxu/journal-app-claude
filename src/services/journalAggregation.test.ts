import { describe, expect, it, vi } from "vitest";
import type { Journal } from "../types/journal";
import {
  createJournalEntryId,
  findDailySummary,
  isDailySummary,
  mergeIntoDailySummary,
  upsertJournalEntryWithDailySummary,
} from "./journalAggregation";

function createJournal(overrides: Partial<Journal> = {}): Journal {
  return {
    id: "journal-legacy",
    date: "2026-05-15",
    weekday: "周五",
    mood: "开心",
    source: "girlfriend",
    content: "第一段日记",
    voiceMessages: [],
    ...overrides,
  };
}

describe("journalAggregation", () => {
  it("creates unique entry ids instead of reusing date ids", () => {
    const id = createJournalEntryId("2026-05-15");
    expect(id).toContain("journal-entry-2026-05-15-");
  });

  it("adds both a daily summary and a standalone entry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T10:00:00.000Z"));

    const result = upsertJournalEntryWithDailySummary([], createJournal());

    expect(result.journals).toHaveLength(2);
    expect(isDailySummary(result.summary)).toBe(true);
    expect(result.entry.id).not.toBe("journal-legacy");
    expect(findDailySummary(result.journals, "2026-05-15")?.content).toBe("第一段日记");
    expect(result.journals[0].id).toBe(result.entry.id);
    expect(result.journals[1].id).toBe(result.summary.id);
  });

  it("appends same-day content into the daily summary without overwriting history", () => {
    const first = upsertJournalEntryWithDailySummary([], createJournal({ content: "第一段日记" }));
    const second = upsertJournalEntryWithDailySummary(first.journals, createJournal({ content: "第二段日记" }));

    const summary = findDailySummary(second.journals, "2026-05-15");
    expect(summary?.content).toContain("第一段日记");
    expect(summary?.content).toContain("第二段日记");
    expect(summary?.entryIds).toHaveLength(2);
    expect(second.journals.filter((item) => !item.isDailySummary)).toHaveLength(2);
  });

  it("preserves selfies and night bonus when merging", () => {
    const existing = createJournal({
      id: "journal-day-2026-05-15",
      isDailySummary: true,
      selfies: ["selfie-a"],
      nightBonusSelfie: "night-a",
      content: "旧内容",
      voiceMessages: [{ id: "v1", timing: "morning", transcript: "hi", duration: "0:10" }],
    });
    const merged = mergeIntoDailySummary(existing, createJournal({
      id: "entry-b",
      selfies: ["selfie-b"],
      content: "新内容",
      voiceMessages: [{ id: "v2", timing: "night", transcript: "bye", duration: "0:09" }],
    }));

    expect(merged.selfies).toEqual(["selfie-a", "selfie-b"]);
    expect(merged.nightBonusSelfie).toBe("night-a");
    expect(merged.voiceMessages).toHaveLength(2);
  });
});
