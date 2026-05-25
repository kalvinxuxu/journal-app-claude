import { describe, expect, it } from "vitest";
import { countJournalsByUserId, type Journal } from "./journalStore.js";

describe("countJournalsByUserId", () => {
  it("counts only matching user journals while treating legacy entries as local-user", () => {
    const journals: Journal[] = [
      { id: "j1", date: "2026-05-20", weekday: "周三", mood: "开心", source: "user", content: "a", voiceMessages: [] },
      { id: "j2", date: "2026-05-21", weekday: "周四", mood: "开心", source: "user", content: "b", voiceMessages: [], userId: "local-user" },
      { id: "j3", date: "2026-05-22", weekday: "周五", mood: "开心", source: "user", content: "c", voiceMessages: [], userId: "other-user" },
    ];

    expect(countJournalsByUserId(journals, "local-user")).toBe(2);
    expect(countJournalsByUserId(journals, "other-user")).toBe(1);
  });
});
