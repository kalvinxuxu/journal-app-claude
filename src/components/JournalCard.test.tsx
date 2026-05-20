// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { JournalCard } from "./JournalCard";
import type { Journal } from "../types/journal";

vi.mock("../services/minimax", () => ({
  synthesizeContentSpeech: vi.fn(async () => "data:audio/mpeg;base64,ZmFrZQ=="),
}));

describe("JournalCard", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  const journal: Journal = {
    id: "journal-2026-05-09",
    date: "2026-05-09",
    weekday: "周五",
    mood: "开心",
    content: "今天路过那家咖啡店，想起你上次说想试试他家的拿铁。",
    images: ["coffee-shop", "latte-cup", "rain-window"],
    voiceMessages: [
      {
        id: "voice-1",
        timing: "morning",
        transcript: "早安呀，今天的阳光很好。",
        duration: "0:15",
      },
    ],
  };

  it("renders images for journal tiles", () => {
    render(<JournalCard journal={journal} active={false} onSelect={() => {}} />);

    const images = document.querySelectorAll(".image-tile img");
    expect(images.length).toBe(3);
    expect((images[0] as HTMLImageElement).alt).toBe("配图 1");
    expect((images[1] as HTMLImageElement).alt).toBe("配图 2");
    expect((images[2] as HTMLImageElement).alt).toBe("配图 3");
  });

  it("plays content audio using the rendered audio element", async () => {
    render(<JournalCard journal={journal} active={false} onSelect={() => {}} />);

    fireEvent.click(screen.getAllByRole("button", { name: "播放日记内容" })[0]);

    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());
  });
});
