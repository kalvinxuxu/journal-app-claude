import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { GreetingRevealView } from "./GreetingRevealView";
import type { GreetingCard } from "../../services/greetingStore";

const mockGreeting: GreetingCard = {
  id: "test-greeting-1",
  timing: "morning",
  content: "早安！今天也想你。",
  deliveredAt: new Date().toISOString(),
  isRead: false,
};

describe("GreetingRevealView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders greeting content element", () => {
    const onComplete = vi.fn();
    const { container } = render(<GreetingRevealView greeting={mockGreeting} onComplete={onComplete} />);

    // Check that a card element exists
    const card = container.querySelector(".detail-card");
    expect(card).toBeTruthy();
  });

  it("shows timing label", () => {
    const onComplete = vi.fn();
    render(<GreetingRevealView greeting={mockGreeting} onComplete={onComplete} />);

    expect(screen.getByText("早安")).toBeTruthy();
  });

  it("starts typewriter effect on mount", () => {
    const onComplete = vi.fn();
    render(<GreetingRevealView greeting={mockGreeting} onComplete={onComplete} />);

    // The cursor should be visible initially
    const cursor = document.querySelector(".typewriter-cursor");
    expect(cursor).toBeTruthy();
  });

  it("completes reveal after all characters", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<GreetingRevealView greeting={mockGreeting} onComplete={onComplete} />);

    // Advance timers past the total animation time
    // Content is 9 chars at 40ms each = 360ms total
    vi.advanceTimersByTime(400);

    // onComplete should have been called
    expect(onComplete).toHaveBeenCalled();
  });

  it("skip hint visible during reveal", () => {
    const onComplete = vi.fn();
    render(<GreetingRevealView greeting={mockGreeting} onComplete={onComplete} />);

    // During reveal, skip hint should be visible
    expect(screen.getByText("点击跳过")).toBeTruthy();
  });

  it("skip completes reveal immediately", () => {
    const onComplete = vi.fn();
    const { container } = render(<GreetingRevealView greeting={mockGreeting} onComplete={onComplete} />);

    // Click the card during reveal
    const card = container.querySelector(".detail-card");
    card && act(() => { card.click(); });

    // onComplete should be called immediately
    expect(onComplete).toHaveBeenCalled();
  });
});