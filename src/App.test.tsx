// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./components/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("./pages/HomePage", () => ({
  HomePage: () => <div>Home Page</div>,
}));

vi.mock("./pages/SettingsPage", () => ({
  SettingsPage: () => <div>Settings</div>,
}));

vi.mock("./pages/WritePage", () => ({
  WritePage: () => <div>Write</div>,
}));

vi.mock("./pages/AskHerPage", () => ({
  AskHerPage: () => <div>Ask Her</div>,
}));

vi.mock("./pages/PhotoWallPage", () => ({
  PhotoWallPage: () => <div>Photo Wall</div>,
}));

vi.mock("./pages/GreetingPage", () => ({
  GreetingPage: () => <div>Greeting</div>,
}));

vi.mock("./pages/CompanionOnboardingPage", () => ({
  CompanionOnboardingPage: () => <div>Companion Onboarding</div>,
}));

const mockCheckCompanionOnboardingStatus = vi.fn(() => new Promise<never>(() => {}));

vi.mock("./services/api/companionClient", () => ({
  checkCompanionOnboardingStatus: (...args: unknown[]) => mockCheckCompanionOnboardingStatus(...args),
}));

vi.mock("./services/api/mediaClient", () => ({
  checkBackendHealth: vi.fn().mockResolvedValue(true),
}));

vi.mock("./services/companion", () => ({
  loadCompanionReveal: vi.fn(() => null),
  saveCompanionReveal: vi.fn(),
}));

vi.mock("./services/generator", () => ({
  addJournalToMemory: vi.fn(),
  getMemoryEngine: vi.fn(() => ({ seed: vi.fn() })),
}));

vi.mock("./services/memory", () => ({
  loadJournalsWithSource: vi.fn(() => ({ journals: [], source: "empty" })),
  loadJournalsWithBackendFallback: vi.fn(),
  journalExistsOnBackend: vi.fn(),
  loadPreferences: vi.fn(() => ({ voiceStyle: "soft" })),
  loadSelectedJournalId: vi.fn(() => ""),
  loadValidReferenceImage: vi.fn(),
  saveJournals: vi.fn(),
  saveJournalToBackend: vi.fn(),
  saveLatestSelfie: vi.fn(),
  savePreferences: vi.fn(),
  saveSelectedJournalId: vi.fn(),
  saveReferenceImageAsBase64: vi.fn(),
  migrateLocalStorageJournalsToBackend: vi.fn(),
  getCurrentUserId: vi.fn(() => "local-user"),
}));

vi.mock("./services/memoryRebuild", () => ({
  rebuildMemoryFromJournals: vi.fn(() => ({ entries: [] })),
}));

vi.mock("./services/minimax", () => ({
  generateGirlfriendSelfies: vi.fn(),
  generateNightBonusSelfie: vi.fn(),
  synthesizeVoiceMessages: vi.fn(),
}));

vi.mock("./services/selfieSharing", () => ({
  shouldTriggerMorningSelfie: vi.fn(() => false),
  shouldTriggerNightBonus: vi.fn(() => false),
}));

vi.mock("./services/journalGeneration", () => ({
  generateJournalDraft: vi.fn(),
}));

vi.mock("./services/journalAggregation", () => ({
  isDailySummary: vi.fn(() => false),
  toJournalEntry: vi.fn((journal) => journal),
}));

vi.mock("./services/generation/taskStore", () => ({
  taskStore: { loadTasks: vi.fn(() => []), upsertTask: vi.fn() },
}));

vi.mock("./services/greetingStore", () => ({
  greetingStore: { getGreetingIds: vi.fn(() => new Set()), addGreeting: vi.fn() },
}));

describe("App onboarding gating", () => {
  it("does not flash onboarding while companion status is still loading", () => {
    render(<App />);

    expect(screen.queryByText("Companion Onboarding")).toBeNull();
  });

  it("does not mark companion onboarding complete until the naming stage resolves", async () => {
    const onboardingStatus = Promise.resolve({ completed: false, archetype: null, reveal: null });
    mockCheckCompanionOnboardingStatus.mockReturnValue(onboardingStatus);

    render(<App />);
    expect(await screen.findByText("Companion Onboarding")).toBeDefined();
  });
});
