import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanionOnboardingPage } from "./CompanionOnboardingPage";
import { initializeCompanionOnboarding } from "../services/api/companionClient";

vi.mock("../services/api/companionClient", () => ({
  initializeCompanionOnboarding: vi.fn().mockResolvedValue({
    profile: { archetype: "gentle_older", mode: "real" },
    relationship: { stage: "initial", initiativeScore: 50 },
  }),
}));

describe("CompanionOnboardingPage", () => {
  it("submits the first 3 answers and calls onCompleted with the initial companion result", async () => {
    const onCompleted = vi.fn();

    render(<CompanionOnboardingPage onCompleted={onCompleted} />);

    fireEvent.click(screen.getByRole("button", { name: "更真实一点" }));
    fireEvent.click(screen.getByRole("button", { name: "刚好就好" }));
    fireEvent.click(screen.getByRole("button", { name: "温柔成熟" }));

    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  });
});
