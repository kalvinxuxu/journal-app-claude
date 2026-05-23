// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("./pages/AskHerPage", () => ({
  AskHerPage: () => <div>Ask Her</div>,
}));

vi.mock("./pages/PhotoWallPage", () => ({
  PhotoWallPage: () => <div>Photo Wall</div>,
}));

vi.mock("./pages/CompanionOnboardingPage", () => ({
  CompanionOnboardingPage: () => <div>Companion Onboarding</div>,
}));

const mockCheckCompanionOnboardingStatus = vi.fn(() => new Promise<never>(() => {}));
const mockPersistCompanionRevealPortrait = vi.fn();
const mockGenerateRevealPortrait = vi.fn();
const mockSaveCompanionReveal = vi.fn();
const mockSaveReferenceImage = vi.fn();

vi.mock("./services/api/companionClient", () => ({
  checkCompanionOnboardingStatus: (...args: unknown[]) => mockCheckCompanionOnboardingStatus(...args),
  persistCompanionRevealPortrait: (...args: unknown[]) => mockPersistCompanionRevealPortrait(...args),
}));

vi.mock("./services/api/mediaClient", () => ({
  checkBackendHealth: vi.fn().mockResolvedValue(true),
}));

vi.mock("./services/companion", () => ({
  loadCompanionReveal: vi.fn(() => null),
  saveCompanionReveal: (...args: unknown[]) => mockSaveCompanionReveal(...args),
  generateRevealPortrait: (...args: unknown[]) => mockGenerateRevealPortrait(...args),
}));

vi.mock("./services/generator", () => ({
  addJournalToMemory: vi.fn(),
  getMemoryEngine: vi.fn(() => ({ seed: vi.fn() })),
}));

vi.mock("./services/memory", () => ({
  loadJournalsWithSource: vi.fn(() => ({ journals: [], source: "empty" })),
  loadJournalsWithBackendFallback: vi.fn(() => Promise.resolve({ journals: [], source: "empty" })),
  journalExistsOnBackend: vi.fn(() => Promise.resolve(true)),
  loadPreferences: vi.fn(() => ({ voiceStyle: "soft" })),
  loadSelectedJournalId: vi.fn(() => ""),
  loadValidReferenceImage: vi.fn(),
  saveJournals: vi.fn(),
  saveJournalToBackend: vi.fn(),
  saveLatestSelfie: vi.fn(),
  saveReferenceImage: (...args: unknown[]) => mockSaveReferenceImage(...args),
  savePreferences: vi.fn(),
  saveSelectedJournalId: vi.fn(),
  saveReferenceImageAsBase64: vi.fn(),
  migrateLocalStorageJournalsToBackend: vi.fn(() => Promise.resolve({ migrated: 0 })),
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

  it("regenerates reveal portrait when restored prompt is from the old style", async () => {
    mockCheckCompanionOnboardingStatus.mockResolvedValue({
      completed: true,
      archetype: "mature_steady",
      reveal: {
        systemDisplayName: "临川",
        customName: null,
        portraitVersion: 1,
        tagline: "安静，稳，也愿意靠近你。",
        appearancePrompt: "full body portrait, japanese semi-realistic style, simple casual clothing",
        portraitImageUrl: "http://localhost:3001/media/images/old.jpg",
        portraitDescription: "她看起来安静，也更亲近。",
        matchExplanation: "她更像能慢慢靠近你的人。",
        appearanceProfile: {
          hairStyle: "long_hair",
          bodyPresence: "balanced_mature",
          fashionAura: "clean_refined",
          gazeStyle: "steady_warm",
          poseStyle: "poised_shifted_weight",
        },
        personalityProfile: {
          temperament: "mature_steady",
          affectionStyle: "gentle_attentive",
          distanceStyle: "poised",
          initiativeStyle: "measured_forward",
          expressionTone: "light_proud",
        },
      },
    });
    mockGenerateRevealPortrait.mockResolvedValue("http://localhost:3001/media/images/new.jpg");
    mockPersistCompanionRevealPortrait.mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() =>
      expect(mockGenerateRevealPortrait).toHaveBeenCalledWith(
        expect.stringContaining("simple casual clothing"),
      ),
    );
    expect(mockPersistCompanionRevealPortrait).toHaveBeenCalledWith({
      userId: "local-user",
      portraitImageUrl: "http://localhost:3001/media/images/new.jpg",
      portraitVersion: 2,
    });
    expect(mockSaveReferenceImage).toHaveBeenCalledWith("http://localhost:3001/media/images/new.jpg");
    expect(mockSaveCompanionReveal).toHaveBeenCalledWith(
      expect.objectContaining({ portraitImageUrl: "http://localhost:3001/media/images/new.jpg" }),
    );
  });
});
