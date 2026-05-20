// @vitest-environment jsdom

import { afterEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoicePage } from "./VoicePage";
import type { Journal } from "../types/journal";

afterEach(() => {
  document.body.innerHTML = "";
});

const mockJournal: Journal = {
  id: "journal-2026-05-11",
  date: "2026-05-11",
  weekday: "周日",
  mood: "开心",
  content: "今天也想把好心情分你一半。\n\n我刚刚想到你，嘴角就上去了。\n\n有些开心不说出来，反而会更明显。",
  voiceMessages: [
    { id: "vm-1", timing: "morning", transcript: "早安：今天也想把好心情分你一半。", duration: "0:12" },
    { id: "vm-2", timing: "afternoon", transcript: "午后：我刚刚想到你，嘴角就上去了。", duration: "0:15" },
    { id: "vm-3", timing: "night", transcript: "晚安：有些开心不说出来，反而会更明显。", duration: "0:18" },
  ],
};

describe("VoicePage", () => {
  it("renders empty state when no journals exist", () => {
    const { container } = render(<VoicePage journals={[]} selectedJournalId="" />);
    expect(container.querySelector(".empty-state")).toBeTruthy();
    expect(screen.getByText("语音已经回到日记里")).toBeTruthy();
  });

  it("renders empty state when journal has no voice messages", () => {
    const journalNoVoice: Journal = { ...mockJournal, voiceMessages: [] };
    const { container } = render(<VoicePage journals={[journalNoVoice]} selectedJournalId={journalNoVoice.id} />);
    expect(container.querySelector(".empty-state")).toBeTruthy();
  });

  it("renders voice player and transcript when journal has voice messages", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    expect(screen.getByText(/语音页/)).toBeTruthy();
    expect(screen.getByText(/的声音/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /播放/ })).toBeTruthy();
  });

  it("renders prev/next navigation with correct indicator", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: /上一条/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /下一条/ })).toBeTruthy();
  });

  it("navigates to next voice message", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    const nextBtn = screen.getByRole("button", { name: /下一条/ });
    fireEvent.click(nextBtn);

    expect(screen.getByText("2 / 3")).toBeTruthy();
  });

  it("navigates back to previous voice message", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    const nextBtn = screen.getByRole("button", { name: /下一条/ });
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 / 3")).toBeTruthy();

    const prevBtn = screen.getByRole("button", { name: /上一条/ });
    fireEvent.click(prevBtn);

    expect(screen.getByText("1 / 3")).toBeTruthy();
  });

  it("disables prev button on first item", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    const prevBtn = screen.getByRole("button", { name: /上一条/ });
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables next button on last item", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    const nextBtn = screen.getByRole("button", { name: /下一条/ });
    // click twice to get to last
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    const nextBtnAfter = screen.getByRole("button", { name: /下一条/ });
    expect((nextBtnAfter as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows all voice message transcripts in detail card", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    expect(screen.getByText("完整语音稿")).toBeTruthy();
    expect(screen.getByText(/早安：/)).toBeTruthy();
    expect(screen.getByText(/午后：/)).toBeTruthy();
    expect(screen.getByText(/晚安：/)).toBeTruthy();
  });

  it("toggles play/pause when voice control button is clicked", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    const playButton = screen.getByRole("button", { name: /播放/ });
    expect(playButton).toBeTruthy();

    fireEvent.click(playButton);
    expect(screen.getByText("暂停")).toBeTruthy();
  });

  it("starts with play state when first loaded", () => {
    render(<VoicePage journals={[mockJournal]} selectedJournalId={mockJournal.id} />);

    expect(screen.getByText("播放")).toBeTruthy();
  });
});
