import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanionOnboardingPage } from "./CompanionOnboardingPage";
import { initializeCompanionOnboarding } from "../services/api/companionClient";
import { generateRevealPortrait } from "../services/companion";

vi.mock("../services/api/companionClient", () => ({
  initializeCompanionOnboarding: vi.fn().mockResolvedValue({
    profile: { archetype: "gentle_older", mode: "real" },
    relationship: { stage: "initial", initiativeScore: 50 },
    reveal: {
      displayName: "岚夕",
      tagline: "温柔陪伴",
      appearancePrompt: "full body portrait, japanese semi-realistic style",
      portraitImageUrl: null,
      portraitDescription: "A gentle companion",
      matchExplanation: "You both value calm moments",
    },
  }),
}));

vi.mock("../services/companion", () => ({
  generateRevealPortrait: vi.fn().mockResolvedValue("http://localhost:3001/media/images/reveal-portrait.jpg"),
  COMPANION_ONBOARDING_PROMPTS: [
    {
      questionKey: "entry_mode",
      prompt: "如果我开始靠近你，你希望我更像真实的人，还是只会出现在你这里的梦？",
      options: [
        { label: "更真实一点", value: "real" },
        { label: "更像梦", value: "fantasy" },
      ],
    },
    {
      questionKey: "initiative_preference",
      prompt: "你更喜欢她主动靠近，还是把分寸留给你来决定？",
      options: [
        { label: "更克制一点", value: "low" },
        { label: "刚好就好", value: "balanced" },
        { label: "更主动一点", value: "high" },
      ],
    },
    {
      questionKey: "ideal_presence",
      prompt: "如果她第一次看向你，你更容易被怎样的感觉吸引？",
      options: [
        { label: "温柔成熟", value: "gentle_older" },
        { label: "安静柔和", value: "soft_stable" },
        { label: "有一点俏皮", value: "playful_warm" },
      ],
    },
  ],
}));

describe("CompanionOnboardingPage", () => {
  it("submits the first 3 answers and calls onCompleted with the initial companion result", async () => {
    const onCompleted = vi.fn();

    render(<CompanionOnboardingPage onCompleted={onCompleted} />);

    fireEvent.click(screen.getByRole("button", { name: "更真实一点" }));
    fireEvent.click(screen.getByRole("button", { name: "刚好就好" }));
    fireEvent.click(screen.getByRole("button", { name: "温柔成熟" }));

    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    const result = onCompleted.mock.calls[0][0];
    expect(result.reveal.portraitImageUrl).toBe("http://localhost:3001/media/images/reveal-portrait.jpg");
  });

  it("renders the reveal page with the generated portrait image", async () => {
    const onCompleted = vi.fn();

    render(<CompanionOnboardingPage onCompleted={onCompleted} />);

    fireEvent.click(screen.getByRole("button", { name: "更真实一点" }));
    fireEvent.click(screen.getByRole("button", { name: "刚好就好" }));
    fireEvent.click(screen.getByRole("button", { name: "温柔成熟" }));

    expect(await screen.findByRole("img", { name: "岚夕立绘" })).toBeDefined();
  });
});
