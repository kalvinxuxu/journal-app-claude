// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { WritePage } from "./WritePage";

vi.mock("../services/journalGeneration", () => ({
  generateJournalDraft: vi.fn(async ({ mood }: { mood: string }) => ({
    content: mood === "想念" ? "今天的思念格外浓。" : "今天的阳光很温暖，想起你就会笑。",
    voiceMessages: [
      { id: "voice-morning", timing: "morning" as const, transcript: "早安！", duration: "0:12" },
      { id: "voice-afternoon", timing: "afternoon" as const, transcript: "午后安", duration: "0:15" },
      { id: "voice-night", timing: "night" as const, transcript: "晚安～", duration: "0:18" },
    ],
    memoryActivated: false,
  })),
}));

const mockCreateGenerationTask = vi.fn();
const mockPollGenerationTask = vi.fn();

vi.mock("../services/generation/apiTaskClient", () => ({
  createGenerationTask: (...args: unknown[]) => mockCreateGenerationTask(...args),
}));

vi.mock("../services/generation/taskPolling", () => ({
  pollGenerationTask: (...args: unknown[]) => mockPollGenerationTask(...args),
}));

vi.mock("../services/minimax", () => ({
  buildJournalImagePrompt: vi.fn(() => "generated task prompt"),
  persistImagesIfNeeded: vi.fn(async (images) => images),
  persistAudiosIfNeeded: vi.fn(async (voiceMessages) => voiceMessages),
  generateGirlfriendSelfies: vi.fn(),
  persistImageIfNeeded: vi.fn(async (url) => url),
  buildJournalMedia: vi.fn(async (journal) => ({
    journal: {
      ...journal,
      images: ["data:image/svg+xml;base64,PHN2Zy8+"],
      voiceMessages: journal.voiceMessages.map((message, index) => ({
        ...message,
        audioUrl: `data:audio/mpeg;base64,ZmFrZS1hdWRpby0${index}`,
      })),
    },
    errors: {},
  })),
}));

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("WritePage", () => {
  beforeEach(() => {
    mockCreateGenerationTask.mockResolvedValue({
      task: { id: "tsk_write_1", status: "queued", type: "media_generation" },
      deduped: false,
    });
    mockPollGenerationTask.mockResolvedValue({
      id: "tsk_write_1",
      status: "succeeded",
      type: "media_generation",
      output: {
        images: ["https://example.com/image-1.png"],
        voiceMessages: [
          { id: "voice-morning", timing: "morning", transcript: "早安！", duration: "0:12", audioUrl: "data:audio/mock" },
          { id: "voice-afternoon", timing: "afternoon", transcript: "午后安", duration: "0:15", audioUrl: "data:audio/mock" },
          { id: "voice-night", timing: "night", transcript: "晚安～", duration: "0:18", audioUrl: "data:audio/mock" },
        ],
      },
      error: null,
    });
  });

  it("renders form fields correctly", async () => {
    const mockOnSave = () => {};
    const mockOnCancel = () => {};

    render(<WritePage onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());
    expect(screen.getByText("我来写")).toBeDefined();
    expect(screen.getByText("把今天记下来")).toBeDefined();
  });

  it("submits a media_generation task when save is clicked", async () => {
    const captured: unknown[] = [];
    const mockOnSave = (journal: unknown) => captured.push(journal);
    const mockOnCancel = () => {};

    render(<WritePage onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());

    const saveButton = screen.getByRole("button", { name: "写好并请她补全" });
    fireEvent.click(saveButton);

    await waitFor(() => expect(mockCreateGenerationTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: "media_generation" })
    ));
    expect(mockPollGenerationTask).toHaveBeenCalledWith("tsk_write_1");
  });

  it("submits executable media task input with prompt and voiceScripts", async () => {
    render(<WritePage onSave={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "写好并请她补全" }));

    await waitFor(() => expect(mockCreateGenerationTask).toHaveBeenCalled());
    expect(mockCreateGenerationTask).toHaveBeenCalledWith(expect.objectContaining({
      type: "media_generation",
      input: expect.objectContaining({
        prompt: expect.any(String),
        voiceScripts: expect.any(Array),
      }),
    }));
  });

  it("calls onSave with correct journal data after task succeeds", async () => {
    const captured: unknown[] = [];
    const mockOnSave = (journal: unknown) => captured.push(journal);
    const mockOnCancel = () => {};

    render(<WritePage onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "写好并请她补全" }));

    await waitFor(() => expect(captured).toHaveLength(1));
    const saved = captured[0] as { mood: string; content: string; voiceMessages: unknown[] };
    expect(saved.mood).toBe("开心");
    expect(saved.content).toBeTruthy();
    expect(saved.voiceMessages).toHaveLength(3);
  });

  it("shows the generating label while task is running", async () => {
    mockPollGenerationTask.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        id: "tsk_write_1",
        status: "succeeded",
        output: { images: [], voiceMessages: [] },
        error: null,
      }), 100);
    }));

    const mockOnSave = () => {};
    const mockOnCancel = () => {};

    render(<WritePage onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "写好并请她补全" }));

    expect(screen.getByRole("button", { name: "生成中..." })).toBeDefined();

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());
  });

  it("shows error state when task fails", async () => {
    mockPollGenerationTask.mockResolvedValueOnce({
      id: "tsk_write_fail",
      status: "failed",
      output: null,
      error: { code: "ERROR", message: "生成失败：网络错误", retryable: true },
    });

    const mockOnSave = () => {};
    const mockOnCancel = () => {};

    render(<WritePage onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "写好并请她补全" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "失败重试" })).toBeDefined());
    expect(screen.getAllByText("生成失败：网络错误")).toHaveLength(2);
  });

  it("shows retry guidance when a task returns stale", async () => {
    mockPollGenerationTask.mockResolvedValueOnce({
      id: "tsk_stale_ui",
      status: "stale",
      output: null,
      error: { code: "LEASE_EXPIRED", message: "任务已过期，请重试", retryable: true },
    });

    const mockOnSave = () => {};
    const mockOnCancel = () => {};

    render(<WritePage onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "写好并请她补全" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "失败重试" })).toBeDefined());
    expect(screen.getAllByText("任务已过期，请重试")).toHaveLength(2);
  });

  it("falls back to sync mode when task creation fails", async () => {
    mockCreateGenerationTask.mockRejectedValueOnce(new Error("Network error"));

    const captured: unknown[] = [];
    const mockOnSave = (journal: unknown) => captured.push(journal);
    const mockOnCancel = () => {};

    render(<WritePage onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "写好并请她补全" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "写好并请她补全" }));

    await waitFor(() => expect(captured).toHaveLength(1));
  });
});
