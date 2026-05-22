import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanionFeedbackBar } from "./CompanionFeedbackBar";

describe("CompanionFeedbackBar", () => {
  it("exposes low-visibility feedback choices without a settings-heavy UI", () => {
    const onSelect = vi.fn();

    render(<CompanionFeedbackBar onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "更喜欢她这样说" }));

    expect(onSelect).toHaveBeenCalledWith("tone_like");
  });
});
