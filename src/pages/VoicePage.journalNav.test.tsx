// @vitest-environment jsdom

import { afterEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoicePage } from "./VoicePage";
import type { Journal } from "../types/journal";

afterEach(() => {
  document.body.innerHTML = "";
});

const createJournal = (overrides: Partial<Journal> = {}): Journal => ({
  id: "journal-1",
  date: "2026-05-11",
  weekday: "周日",
  mood: "开心",
  content: "今天也很开心。",
  voiceMessages: [
    { id: "vm-1", timing: "morning" as const, transcript: "早安：开心。", duration: "0:12" },
    { id: "vm-2", timing: "afternoon" as const, transcript: "午后：开心。", duration: "0:15" },
    { id: "vm-3", timing: "night" as const, transcript: "晚安：开心。", duration: "0:18" },
  ],
  ...overrides,
});

describe("VoicePage — journal-level navigation", () => {
  it("renders journal indicator showing correct count", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j1" />);

    expect(screen.getByText("1 / 2 篇")).toBeTruthy();
  });

  it("navigates to next journal and resets voice index to 0", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心", content: "第一篇" }),
      createJournal({ id: "j2", mood: "想念", content: "第二篇" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j1" />);

    // Navigate to second voice message in first journal
    const nextVoiceBtn = screen.getByRole("button", { name: /下一条/ });
    fireEvent.click(nextVoiceBtn);
    expect(screen.getByText("2 / 3")).toBeTruthy();

    // Navigate to next journal
    const nextJournalBtn = screen.getByRole("button", { name: /下一篇日记/ });
    fireEvent.click(nextJournalBtn);

    // Should reset to 1/3 and show second journal's mood
    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.getByText(/想念.*的声音/)).toBeTruthy();
  });

  it("navigates to previous journal", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j2" />);

    const prevJournalBtn = screen.getByRole("button", { name: /上一篇日记/ });
    fireEvent.click(prevJournalBtn);

    expect(screen.getByText("1 / 2 篇")).toBeTruthy();
    expect(screen.getByText(/开心.*的声音/)).toBeTruthy();
  });

  it("disables prev journal button on first journal", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j1" />);

    const prevJournalBtn = screen.getByRole("button", { name: /上一篇日记/ });
    expect((prevJournalBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables next journal button on last journal", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j2" />);

    const nextJournalBtn = screen.getByRole("button", { name: /下一篇日记/ });
    expect((nextJournalBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("journals without voice messages are filtered out", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念", voiceMessages: [] }),
      createJournal({ id: "j3", mood: "平静" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j1" />);

    expect(screen.getByText("1 / 2 篇")).toBeTruthy();
  });

  it("initializes to selectedJournalId when provided and it has voice", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念" }),
      createJournal({ id: "j3", mood: "平静" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j2" />);

    expect(screen.getByText("2 / 3 篇")).toBeTruthy();
    expect(screen.getByText(/想念.*的声音/)).toBeTruthy();
  });

  it("shows correct mood label on prev/next journal buttons", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念" }),
      createJournal({ id: "j3", mood: "平静" }),
    ];
    render(<VoicePage journals={journals} selectedJournalId="j2" />);

    // Previous button should show previous journal's mood
    const prevBtn = screen.getByRole("button", { name: /上一篇日记/ });
    expect(prevBtn.textContent).toContain("开心");

    // Next button should show next journal's mood
    const nextBtn = screen.getByRole("button", { name: /下一篇日记/ });
    expect(nextBtn.textContent).toContain("平静");
  });

  it("syncs to external selectedJournalId changes and resets voice index", () => {
    const journals = [
      createJournal({ id: "j1", mood: "开心" }),
      createJournal({ id: "j2", mood: "想念" }),
    ];
    const { rerender } = render(<VoicePage journals={journals} selectedJournalId="j1" />);

    fireEvent.click(screen.getByRole("button", { name: /下一条/ }));
    expect(screen.getByText("2 / 3")).toBeTruthy();

    rerender(<VoicePage journals={journals} selectedJournalId="j2" />);

    expect(screen.getByText("2 / 2 篇")).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.getByText(/想念.*的声音/)).toBeTruthy();
  });
});
