// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AskHerPage } from "./AskHerPage";
import { generateJournalDraft } from "../services/journalGeneration";

const mockCreateGenerationTask = vi.fn();
const mockPollGenerationTask = vi.fn();
let mockBuildJournalMedia = vi.fn();

vi.mock("../services/generation/apiTaskClient", () => ({
  createGenerationTask: (...args: unknown[]) => mockCreateGenerationTask(...args),
}));

vi.mock("../services/generation/taskPolling", () => ({
  pollGenerationTask: (...args: unknown[]) => mockPollGenerationTask(...args),
}));

vi.mock("../services/journalGeneration", () => ({
  generateJournalDraft: vi.fn(async ({ mood }: { mood: string }) => ({
    content: mood === "想念"
      ? "今天的思念格外浓，想和你一起散步。"
      : "今天的阳光很温暖，想起你就会笑。",
    voiceMessages: [
      { id: "voice-morning", timing: "morning" as const, transcript: "早安！", duration: "0:12" },
      { id: "voice-afternoon", timing: "afternoon" as const, transcript: "午后安", duration: "0:15" },
      { id: "voice-night", timing: "night" as const, transcript: "晚安～", duration: "0:18" },
    ],
    memoryActivated: false,
    source: "remote",
  })),
}));

vi.mock("../services/minimax", () => ({
  buildJournalImagePrompt: vi.fn(() => "scene prompt"),
  persistAudiosIfNeeded: vi.fn(async (voiceMessages) => voiceMessages),
  persistImagesIfNeeded: vi.fn(async (images) => images),
  buildJournalMedia: (...args: unknown[]) => mockBuildJournalMedia(...args),
}));

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("AskHerPage", () => {
  beforeEach(() => {
    mockCreateGenerationTask.mockResolvedValue({
      task: { id: "tsk_ask_1", status: "queued", type: "media_generation" },
      deduped: false,
    });
    mockPollGenerationTask.mockResolvedValue({
      id: "tsk_ask_1",
      status: "succeeded",
      output: {
        images: ["https://example.com/image.png"],
        voiceMessages: [],
      },
      error: null,
    });
    mockBuildJournalMedia = vi.fn(async (journal: import("../types/journal").Journal) => ({
      journal: {
        ...journal,
        images: ["https://example.com/image.png"],
        voiceMessages: journal.voiceMessages,
      },
      errors: {},
    }));
  });

  it("renders the ask-her page hero", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("让她来记录这一天")).toBeDefined();
  });

  it("shows the generate button with correct label", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: "请她写" })).toBeDefined();
  });

  it("shows date and mood pickers", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("日期")).toBeDefined();
    expect(screen.getByText("心情")).toBeDefined();
  });

  it("shows optional scene hint input", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("场景提示（可选）")).toBeDefined();
  });

  it("does not show a textbox with pre-filled content", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    const textboxes = screen.queryAllByRole("textbox");
    textboxes.forEach((tb) => {
      expect(tb.textContent).not.toContain("手动正文");
    });
  });

  it("calls onSave with girlfriend source when content is saved", async () => {
    const captured: unknown[] = [];
    const mockOnSave = (journal: unknown) => captured.push(journal);

    render(<AskHerPage onSave={mockOnSave} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "请她写" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "请她写" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "保存日记" }));

    await waitFor(() => expect(captured).toHaveLength(1));
    const saved = captured[0] as { source: string };
    expect(saved.source).toBe("girlfriend");
  });

  it("shows preview content after generation", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "请她写" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "请她写" }));

    await waitFor(() => expect(screen.getByText("她写的日记")).toBeDefined());
  });

  it("calls onCancel and returns home", async () => {
    const mockOnCancel = vi.fn();

    render(<AskHerPage onSave={vi.fn()} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("falls back to direct media generation when task succeeds without images", async () => {
    mockPollGenerationTask.mockResolvedValueOnce({
      id: "tsk_ask_empty",
      status: "succeeded",
      output: {
        images: [],
        voiceMessages: [],
      },
      error: null,
    });

    const captured: unknown[] = [];
    render(<AskHerPage onSave={(journal) => captured.push(journal)} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("场景提示（可选）"), {
      target: { value: "看电影" },
    });

    fireEvent.click(screen.getByRole("button", { name: "请她写" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "保存日记" }));

    await waitFor(() => expect(mockBuildJournalMedia).toHaveBeenCalled());
    await waitFor(() => expect(captured).toHaveLength(1));
    expect((captured[0] as { images?: string[] }).images).toEqual(["https://example.com/image.png"]);
  });

  it("passes sceneHint into draft generation", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("场景提示（可选）"), {
      target: { value: "看电影" },
    });

    fireEvent.click(screen.getByRole("button", { name: "请她写" }));

    await waitFor(() => expect(generateJournalDraft).toHaveBeenCalledWith(
      expect.objectContaining({ sceneHint: "看电影" }),
    ));
  });

  it("does not block save on selfie generation during direct fallback", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "请她写" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "保存日记" }));

    await waitFor(() => expect(mockBuildJournalMedia).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ generateSelfies: false }),
    ));
  });
});
