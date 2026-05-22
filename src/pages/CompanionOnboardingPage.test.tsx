import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanionOnboardingPage } from "./CompanionOnboardingPage";
import { initializeCompanionOnboarding, persistCompanionRevealPortrait, saveCompanionCustomName } from "../services/api/companionClient";
import { generateRevealPortrait } from "../services/companion";

vi.mock("../services/api/companionClient", () => ({
  initializeCompanionOnboarding: vi.fn().mockResolvedValue({
    profile: { archetype: "mature_steady", mode: "real" },
    relationship: { stage: "initial", initiativeScore: 45 },
    reveal: {
      systemDisplayName: "临川",
      customName: null,
      tagline: "她看上去很稳，但并不冷。",
      appearancePrompt: "semi-realistic full body portrait, long hair, poised shifted weight",
      portraitImageUrl: null,
      portraitDescription: "她站着的时候很稳，像先把情绪收好，再认真看向你。",
      matchExplanation: "你不是会被热闹瞬间说服的人，所以来到这里的是一个有分寸的人。",
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
  }),
  persistCompanionRevealPortrait: vi.fn().mockResolvedValue(undefined),
  saveCompanionCustomName: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/companion", () => ({
  generateRevealPortrait: vi.fn().mockResolvedValue("http://localhost:3001/media/images/reveal-portrait.jpg"),
}));

describe("CompanionOnboardingPage", () => {
  it("collects intake, both answer rounds, reveal portrait, and custom naming before completion", async () => {
    const onCompleted = vi.fn();

    render(<CompanionOnboardingPage onCompleted={onCompleted} />);

    expect(screen.getByRole("heading", { name: "先从你开始" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "更像真实世界里会遇见的人" }));

    fireEvent.click(screen.getByRole("button", { name: "慢热，但熟了以后会很深" }));
    fireEvent.click(screen.getByRole("button", { name: "感受会留得比较久" }));
    fireEvent.click(screen.getByRole("button", { name: "先收着，不会立刻说很多" }));

    fireEvent.click(screen.getByRole("button", { name: "稳一点，像很难被轻易晃动的人" }));
    fireEvent.click(screen.getByRole("button", { name: "会照顾人，但不会用力过猛" }));
    fireEvent.click(screen.getByRole("button", { name: "有边界，但不是冷" }));
    fireEvent.click(screen.getByRole("button", { name: "会往前一步，但懂得停" }));
    fireEvent.click(screen.getByRole("button", { name: "偶尔有一点傲气" }));
    fireEvent.click(screen.getByRole("button", { name: "长发" }));
    fireEvent.click(screen.getByRole("button", { name: "匀称、成熟一点的存在感" }));

    expect(await screen.findByText("她正在慢慢成形")).toBeDefined();
    expect(await screen.findByText("临川")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "继续" }));

    expect(await screen.findByPlaceholderText("你想怎么叫她")).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText("你想怎么叫她"), { target: { value: "晚晴" } });
    fireEvent.click(screen.getByRole("button", { name: "就这样叫她" }));

    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  });
});