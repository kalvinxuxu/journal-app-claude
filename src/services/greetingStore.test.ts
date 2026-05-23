// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Import after mock is set up
import { greetingStore, type GreetingCard } from "./greetingStore";

const SAMPLE_GREETING: GreetingCard = {
  id: "test-greeting-1",
  timing: "morning",
  content: "早安！今天天气真好。",
  deliveredAt: new Date().toISOString(),
  voiceStyle: "warm",
};

describe("greetingStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("addGreeting", () => {
    it("adds a new greeting to storage", () => {
      greetingStore.addGreeting(SAMPLE_GREETING);
      const greetings = greetingStore.getGreetings();
      expect(greetings).toHaveLength(1);
      expect(greetings[0].id).toBe("test-greeting-1");
    });

    it("marks newly added greeting as unread", () => {
      greetingStore.addGreeting(SAMPLE_GREETING);
      const greetings = greetingStore.getGreetings();
      expect(greetings[0].isRead).toBe(false);
    });

    it("prevents duplicate greetings by id", () => {
      greetingStore.addGreeting(SAMPLE_GREETING);
      greetingStore.addGreeting(SAMPLE_GREETING);
      const greetings = greetingStore.getGreetings();
      expect(greetings).toHaveLength(1);
    });

    it("limits storage to 50 greetings", () => {
      for (let i = 0; i < 55; i++) {
        greetingStore.addGreeting({ ...SAMPLE_GREETING, id: `greeting-${i}` });
      }
      const greetings = greetingStore.getGreetings();
      expect(greetings).toHaveLength(50);
    });
  });

  describe("getUnreadGreetings", () => {
    it("returns only unread greetings", () => {
      greetingStore.addGreeting(SAMPLE_GREETING);
      // Manually set a greeting as read via localStorage manipulation
      const stored = JSON.stringify([{ ...SAMPLE_GREETING, id: "test-greeting-1", isRead: false }, { ...SAMPLE_GREETING, id: "test-2", isRead: true }]);
      localStorage.setItem("journal-app:greetings", stored);
      const unread = greetingStore.getUnreadGreetings();
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe("test-greeting-1");
    });
  });

  describe("getLatestGreeting", () => {
    it("returns the most recent greeting", () => {
      greetingStore.addGreeting({ ...SAMPLE_GREETING, id: "older" });
      greetingStore.addGreeting({ ...SAMPLE_GREETING, id: "newer" });
      const latest = greetingStore.getLatestGreeting();
      expect(latest?.id).toBe("newer");
    });

    it("returns null when no greetings exist", () => {
      const latest = greetingStore.getLatestGreeting();
      expect(latest).toBeNull();
    });
  });

  describe("markAsRead", () => {
    it("marks a greeting as read", () => {
      greetingStore.addGreeting(SAMPLE_GREETING);
      greetingStore.markAsRead("test-greeting-1");
      const greetings = greetingStore.getGreetings();
      expect(greetings[0].isRead).toBe(true);
    });

    it("only marks the specified greeting", () => {
      greetingStore.addGreeting(SAMPLE_GREETING);
      greetingStore.addGreeting({ ...SAMPLE_GREETING, id: "test-2" });
      greetingStore.markAsRead("test-greeting-1");
      const greetings = greetingStore.getGreetings();
      const read1 = greetings.find(g => g.id === "test-greeting-1");
      const read2 = greetings.find(g => g.id === "test-2");
      expect(read1?.isRead).toBe(true);
      expect(read2?.isRead).toBe(false);
    });
  });

  describe("getGreetingIds", () => {
    it("returns a set of all greeting ids", () => {
      greetingStore.addGreeting(SAMPLE_GREETING);
      greetingStore.addGreeting({ ...SAMPLE_GREETING, id: "test-2" });
      const ids = greetingStore.getGreetingIds();
      expect(ids).toEqual(new Set(["test-greeting-1", "test-2"]));
    });
  });

  describe("clearOld", () => {
    it("removes greetings older than 7 days", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const recentDate = new Date();

      // We need to manipulate localStorage directly to set old dates
      const oldGreeting: GreetingCard = {
        ...SAMPLE_GREETING,
        id: "old-greeting",
        deliveredAt: oldDate.toISOString(),
      };
      const recentGreeting: GreetingCard = {
        ...SAMPLE_GREETING,
        id: "recent-greeting",
        deliveredAt: recentDate.toISOString(),
      };

      localStorage.setItem("journal-app:greetings", JSON.stringify([oldGreeting, recentGreeting]));
      greetingStore.clearOld();
      const remaining = greetingStore.getGreetings();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("recent-greeting");
    });
  });
});