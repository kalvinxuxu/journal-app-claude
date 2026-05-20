// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InlineVoiceBar } from "./InlineVoiceBar";
import type { VoiceMessage } from "../types/journal";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("InlineVoiceBar", () => {
  const morningMessage: VoiceMessage = {
    id: "voice-morning",
    timing: "morning",
    transcript: "早安呀，今天也想你。",
    duration: "0:12",
  };

  const afternoonMessage: VoiceMessage = {
    id: "voice-afternoon",
    timing: "afternoon",
    transcript: "午后的阳光很温柔。",
    duration: "0:15",
  };

  const nightMessage: VoiceMessage = {
    id: "voice-night",
    timing: "night",
    transcript: "晚安，今晚也梦见你。",
    duration: "0:18",
  };

  it("renders the voice bar with aria-label", () => {
    render(<InlineVoiceBar voiceMessages={[morningMessage]} />);

    expect(screen.getByLabelText("日记语音栏")).toBeDefined();
  });

  it("displays morning/afternoon/night timing tabs", () => {
    render(<InlineVoiceBar voiceMessages={[morningMessage, afternoonMessage, nightMessage]} />);

    expect(screen.getByRole("button", { name: "早安" })).toBeDefined();
    expect(screen.getByRole("button", { name: "午后" })).toBeDefined();
    expect(screen.getByRole("button", { name: "晚安" })).toBeDefined();
  });

  it("switches to afternoon tab when clicked", () => {
    render(<InlineVoiceBar voiceMessages={[morningMessage, afternoonMessage, nightMessage]} />);

    fireEvent.click(screen.getByRole("button", { name: "午后" }));

    const btn = screen.getByRole("button", { name: "午后" });
    expect(btn.className).toContain("is-active");
  });

  it("switches to night tab when clicked", () => {
    render(<InlineVoiceBar voiceMessages={[morningMessage, afternoonMessage, nightMessage]} />);

    fireEvent.click(screen.getByRole("button", { name: "晚安" }));

    const btn = screen.getByRole("button", { name: "晚安" });
    expect(btn.className).toContain("is-active");
  });

  it("returns null when voiceMessages is empty", () => {
    const { container } = render(<InlineVoiceBar voiceMessages={[]} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders first voice message player", () => {
    render(<InlineVoiceBar voiceMessages={[morningMessage, afternoonMessage, nightMessage]} />);

    expect(screen.getByText("早安留言")).toBeDefined();
  });
});