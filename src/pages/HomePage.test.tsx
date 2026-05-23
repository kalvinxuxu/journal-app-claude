// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import type { CompanionRevealSummary } from "../types/companion";

const mockFetchCompanionUnlocks = vi.fn(async () => ({ unlocks: [] }));
const mockFetchCompanionContext = vi.fn(async () => ({
  relationshipStage: "familiar",
  recalledMemory: "她记得你昨晚说过想早点睡。",
  initiativeScore: 42,
}));

vi.mock("../services/api/companionClient", () => ({
  fetchCompanionUnlocks: (userId: string) => mockFetchCompanionUnlocks(userId),
  fetchCompanionContext: (userId: string) => mockFetchCompanionContext(userId),
}));

describe("HomePage companion handoff", () => {
  it("shows the matched companion summary above the journal list", async () => {
    const companionReveal: CompanionRevealSummary = {
      systemDisplayName: "岚夕",
      customName: null,
      portraitVersion: 2,
      tagline: "她像夜色里慢慢靠近的人，安静，却不会让你觉得遥远。",
      portraitImageUrl: null,
      appearancePrompt: "full body portrait",
      portraitDescription: "她站着的时候很稳。",
      matchExplanation: "她会先给你安全感。",
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
    };

    render(
      <HomePage
        journals={[{ id: "j1", date: "2026-05-22", weekday: "周五", mood: "开心", source: "user", content: "第一篇", voiceMessages: [] }]}
        dataSource="local"
        selectedJournalId="j1"
        onSelectJournal={vi.fn()}
        onAskHerWrite={vi.fn()}
        companionReveal={companionReveal}
      />,
    );

    expect(screen.getByText("岚夕")).toBeDefined();
    expect(screen.getByText("她像夜色里慢慢靠近的人，安静，却不会让你觉得遥远。")).toBeDefined();
  });
});

describe("HomePage companion echo", () => {
  it("refreshes companion context when journals change", async () => {
    const baseProps = {
      dataSource: "local" as const,
      onSelectJournal: vi.fn(),
      onAskHerWrite: vi.fn(),
      companionReveal: null,
    };

    const { rerender } = render(
      <HomePage
        {...baseProps}
        journals={[{ id: "j1", date: "2026-05-22", weekday: "周五", mood: "开心", source: "user", content: "第一篇", voiceMessages: [] }]}
        selectedJournalId="j1"
      />,
    );

    // Wait for first effect to complete
    await waitFor(() => expect(screen.getByText("她记得你昨晚说过想早点睡。")).toBeDefined());

    // Reset mock to track only the second effect trigger
    mockFetchCompanionContext.mockClear();

    rerender(
      <HomePage
        {...baseProps}
        journals={[
          { id: "j1", date: "2026-05-22", weekday: "周五", mood: "开心", source: "user", content: "第一篇", voiceMessages: [] },
          { id: "j2", date: "2026-05-23", weekday: "周六", mood: "想念", source: "user", content: "第二篇", voiceMessages: [] },
        ]}
        selectedJournalId="j2"
      />,
    );

    await waitFor(() => expect(mockFetchCompanionContext).toHaveBeenCalledTimes(1));
  });
});

describe("HomePage companion handoff", () => {
  it("prefers the custom name in the home handoff hero", () => {
    render(
      <HomePage
        journals={[]}
        dataSource="empty"
        selectedJournalId=""
        onSelectJournal={() => {}}
        onAskHerWrite={() => {}}
        companionReveal={{
          systemDisplayName: "临川",
          customName: "晚晴",
          portraitVersion: 2,
          tagline: "她看上去很稳，但并不冷。",
          appearancePrompt: "",
          portraitImageUrl: null,
          portraitDescription: "她在这里。",
          matchExplanation: "你们会遇见。",
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
        }}
      />,
    );

    expect(screen.getByText("晚晴")).toBeDefined();
    expect(screen.queryByText("临川")).toBeNull();
  });
});
