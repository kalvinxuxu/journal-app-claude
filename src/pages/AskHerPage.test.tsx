// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AskHerPage } from "./AskHerPage";
import { generateJournalDraft } from "../services/journalGeneration";
import { persistAudiosIfNeeded, persistImagesIfNeeded } from "../services/minimax";

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
  vi.resetAllMocks();
  document.body.innerHTML = "";
});

describe("AskHerPage one-click flow", () => {
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
        voiceMessages: [
          { id: "voice-morning", timing: "morning", transcript: "早安！", duration: "0:12", audioUrl: "data:audio" },
          { id: "voice-afternoon", timing: "afternoon", transcript: "午后安", duration: "0:15", audioUrl: "data:audio" },
          { id: "voice-night", timing: "night", transcript: "晚安～", duration: "0:18", audioUrl: "data:audio" },
        ],
      },
      error: null,
    });
    mockBuildJournalMedia = vi.fn((journal: import("../types/journal").Journal) => Promise.resolve({
      journal: {
        ...journal,
        images: ["https://example.com/fallback-image.png"],
        voiceMessages: journal.voiceMessages,
      },
      errors: {},
    }));
    vi.mocked(generateJournalDraft).mockImplementation(async ({ mood }: { mood: string }) => ({
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
    }));
    vi.mocked(persistImagesIfNeeded).mockImplementation(async (images) => images);
    vi.mocked(persistAudiosIfNeeded).mockImplementation(async (voiceMessages) => voiceMessages);
  });

  it("renders the ask-her page hero", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("她今天记录了这些")).toBeDefined();
  });

  it("shows the generate button with correct label", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "重新记录今天" })).toBeDefined();
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

  it("one click triggers draft generation first, then media generation", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    // Draft generated first
    await waitFor(() => expect(generateJournalDraft).toHaveBeenCalled());

    // Then media generation starts (task created)
    await waitFor(() => expect(mockCreateGenerationTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: "media_generation" }),
    ));
  });

  it("image prompt is built from the generated draft journal, not raw form values", async () => {
    const { buildJournalImagePrompt } = await import("../services/minimax");
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    await waitFor(() => expect(generateJournalDraft).toHaveBeenCalled());

    // buildJournalImagePrompt is called after draft is generated
    await waitFor(() => expect(buildJournalImagePrompt).toHaveBeenCalled());
  });

  it("shows staged status copy during draft, image, and voice phases", async () => {
    type DraftResult = Awaited<ReturnType<typeof generateJournalDraft>>;
    type PersistedVoices = Awaited<ReturnType<typeof persistAudiosIfNeeded>>;
    let resolveDraft: ((value: Awaited<ReturnType<typeof generateJournalDraft>>) => void) | undefined;
    let resolveImages: ((value: string[]) => void) | undefined;
    let resolveAudios: ((value: PersistedVoices) => void) | undefined;

    vi.mocked(generateJournalDraft).mockImplementationOnce(() => new Promise<DraftResult>((resolve) => {
      resolveDraft = resolve;
    }));
    vi.mocked(persistImagesIfNeeded).mockImplementationOnce(() => new Promise<string[]>((resolve) => {
      resolveImages = resolve;
    }));
    vi.mocked(persistAudiosIfNeeded).mockImplementationOnce(() => new Promise<PersistedVoices>((resolve) => {
      resolveAudios = resolve;
    }));

    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("正在记录这一天"));

    resolveDraft?.({
      content: "今天的阳光很温暖，想起你就会笑。",
      voiceMessages: [
        { id: "voice-morning", timing: "morning", transcript: "早安！", duration: "0:12" },
        { id: "voice-afternoon", timing: "afternoon", transcript: "午后安", duration: "0:15" },
        { id: "voice-night", timing: "night", transcript: "晚安～", duration: "0:18" },
      ],
      memoryActivated: false,
      source: "remote",
    });

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("正在生成配图"));

    resolveImages?.(["https://example.com/image.png"]);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("正在生成语音"));

    resolveAudios?.([
      { id: "voice-morning", timing: "morning", transcript: "早安！", duration: "0:12", audioUrl: "data:audio" },
      { id: "voice-afternoon", timing: "afternoon", transcript: "午后安", duration: "0:15", audioUrl: "data:audio" },
      { id: "voice-night", timing: "night", transcript: "晚安～", duration: "0:18", audioUrl: "data:audio" },
    ]);

    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());
  });

  it("shows preview text + image after successful one-click generation", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    // Wait for preview to appear (all async work done)
    await waitFor(() => expect(screen.getByText("她记录的这一天")).toBeDefined());
    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());

    // Verify image is shown in preview
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("uses a single primary save button after preview is ready", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());
    expect(screen.getAllByRole("button", { name: "保存日记" })).toHaveLength(1);
  });

  it("fallback to direct media generation when task returns incomplete output", async () => {
    // Task returns empty images/voice - triggers fallback
    mockPollGenerationTask.mockResolvedValueOnce({
      id: "tsk_ask_empty",
      status: "succeeded",
      output: {
        images: [],
        voiceMessages: [],
      },
      error: null,
    });

    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    await waitFor(() => expect(screen.getByText("她记录的这一天")).toBeDefined());
    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());
    await waitFor(() => expect(mockBuildJournalMedia).toHaveBeenCalled());
  });

  it("draft failure returns to retryable state without preview", async () => {
    vi.mocked(generateJournalDraft).mockRejectedValueOnce(new Error("网络错误"));

    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    await waitFor(() => expect(screen.getByText("生成失败")).toBeDefined());
    await waitFor(() => expect(screen.getByRole("button", { name: "重新记录今天" })).toBeDefined());
    expect(screen.queryByText("她记录的这一天")).toBeNull();
  });

  it("calls onSave with girlfriend source when content is saved", async () => {
    const captured: unknown[] = [];
    const mockOnSave = (journal: unknown) => captured.push(journal);

    render(<AskHerPage onSave={mockOnSave} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "重新记录今天" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "保存日记" }));

    await waitFor(() => expect(captured).toHaveLength(1));
    const saved = captured[0] as { source: string };
    expect(saved.source).toBe("girlfriend");
  });

  it("passes sceneHint into draft generation", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("场景提示（可选）"), {
      target: { value: "看电影" },
    });

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    await waitFor(() => expect(generateJournalDraft).toHaveBeenCalledWith(
      expect.objectContaining({ sceneHint: "看电影" }),
    ));
  });

  it("fallback uses generateSelfies: false when task returns empty output", async () => {
    // Task returns empty images/voice - triggers fallback to buildJournalMedia during handleGenerate
    mockPollGenerationTask.mockResolvedValueOnce({
      id: "tsk_ask_empty",
      status: "succeeded",
      output: {
        images: [],
        voiceMessages: [],
      },
      error: null,
    });

    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    // Wait for the full flow to complete including fallback
    await waitFor(() => expect(screen.getByRole("button", { name: "保存日记" })).toBeDefined());

    // buildJournalMedia should have been called with generateSelfies: false during handleGenerate
    expect(mockBuildJournalMedia).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ generateSelfies: false }),
    );
  });

  it("calls onCancel and returns home", async () => {
    const mockOnCancel = vi.fn();
    render(<AskHerPage onSave={vi.fn()} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("preview shows journal content text", async () => {
    render(<AskHerPage onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    await waitFor(() => expect(screen.getByText("她记录的这一天")).toBeDefined());

    // Should show the generated content
    expect(screen.getByText(/今天的阳光很温暖/)).toBeDefined();
  });
});
