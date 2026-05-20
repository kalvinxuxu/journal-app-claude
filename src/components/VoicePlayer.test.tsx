// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VoicePlayer } from "./VoicePlayer";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("VoicePlayer", () => {
  it("plays the minimax audio url when available", () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audioSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(pause);

    render(
      <VoicePlayer
        voiceMessage={{
          id: "voice-1",
          timing: "morning",
          transcript: "早安呀，今天也想你。",
          duration: "0:15",
          audioUrl: "data:audio/mpeg;base64,ZmFrZQ==",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /播放/ }));

    expect(audioSpy).toHaveBeenCalled();
    expect(play).toHaveBeenCalled();
  });
});
