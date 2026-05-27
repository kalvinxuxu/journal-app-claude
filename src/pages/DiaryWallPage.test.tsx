// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DiaryWallPage } from "./DiaryWallPage";
import { generateDailyJournal, regenerateOotd } from "../services/api/companionClient";
import { persistAudiosIfNeeded, persistImagesIfNeeded } from "../services/minimax";

const mockCreateGenerationTask = vi.fn();
const mockPollGenerationTask = vi.fn();
let mockBuildJournalMedia = vi.fn();
const mockReplaceJournalOnBackend = vi.fn();

vi.mock("../services/generation/apiTaskClient", () => ({
  createGenerationTask: (...args: unknown[]) => mockCreateGenerationTask(...args),
}));

vi.mock("../services/generation/taskPolling", () => ({
  pollGenerationTask: (...args: unknown[]) => mockPollGenerationTask(...args),
}));

vi.mock("../services/api/companionClient", () => ({
  submitCompanionFeedback: vi.fn(),
  fetchCompanionContext: vi.fn().mockResolvedValue({}),
  fetchOotdByDate: vi.fn().mockResolvedValue({ id: "ootd-0", title: "今日OOTD", imageUrl: "https://example.com/ootd.jpg", caption: "OOTD caption", date: "2026-05-23", userId: "local-user", rationale: null, styleTags: [], createdAt: "", updatedAt: "" }),
  regenerateOotd: vi.fn().mockResolvedValue({ id: "ootd-1", title: "今日OOTD", imageUrl: null, caption: null, date: "2026-05-23", userId: "local-user", rationale: null, styleTags: [], createdAt: "", updatedAt: "" }),
  fetchAvatarPromptResults: vi.fn().mockResolvedValue({ results: [] }),
  generateDailyJournal: vi.fn(async ({ mood }: { mood: string }) => ({
    journal: {
      id: "journal-test-1",
      date: "2026-05-23",
      weekday: "周五",
      mood,
      source: "girlfriend",
      content: mood === "想念"
        ? "今天的思念格外浓，想和你一起散步。"
        : "今天的阳光很温暖，想起你就会笑。",
      voiceMessages: [
        { id: "voice-morning", timing: "morning", transcript: "早安！", duration: "0:12" },
        { id: "voice-afternoon", timing: "afternoon", transcript: "午后安", duration: "0:15" },
        { id: "voice-night", timing: "night", transcript: "晚安～", duration: "0:18" },
      ],
      voiceStyle: "warm",
    },
  })),
}));

vi.mock("../services/minimax", () => ({
  buildJournalImagePrompt: vi.fn(() => "scene prompt"),
  persistAudiosIfNeeded: vi.fn(async (voiceMessages) => voiceMessages),
  persistImagesIfNeeded: vi.fn(async (images) => images),
  loadReferenceImage: vi.fn(() => null),
  buildJournalMedia: (...args: unknown[]) => mockBuildJournalMedia(...args),
}));

vi.mock("../services/memory", () => ({
  loadReferenceImage: vi.fn(() => null),
  replaceJournalOnBackend: (...args: unknown[]) => mockReplaceJournalOnBackend(...args),
  getCurrentUserId: vi.fn(() => "local-user"),
}));

vi.mock("../services/greetingStore", () => ({
  greetingStore: {
    getLatestGreeting: vi.fn(() => null),
    getGreetingIds: vi.fn(() => new Set()),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("DiaryWallPage wall feed", () => {
  beforeEach(() => {
    mockCreateGenerationTask.mockResolvedValue({
      task: { id: "tsk_dw_1", status: "queued", type: "media_generation" },
      deduped: false,
    });
    mockPollGenerationTask.mockResolvedValue({
      id: "tsk_dw_1",
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
    mockReplaceJournalOnBackend.mockResolvedValue(true);
    vi.mocked(generateDailyJournal).mockImplementation(async ({ mood }: { mood: string }) => ({
      journal: {
        id: "journal-test-1",
        date: "2026-05-23",
        weekday: "周五",
        mood,
        source: "girlfriend",
        content: mood === "想念"
          ? "今天的思念格外浓，想和你一起散步。"
          : "今天的阳光很温暖，想起你就会笑。",
        voiceMessages: [
          { id: "voice-morning", timing: "morning", transcript: "早安！", duration: "0:12" },
          { id: "voice-afternoon", timing: "afternoon", transcript: "午后安", duration: "0:15" },
          { id: "voice-night", timing: "night", transcript: "晚安～", duration: "0:18" },
        ],
        voiceStyle: "warm",
      },
    }));
    vi.mocked(persistImagesIfNeeded).mockImplementation(async (images) => images);
    vi.mocked(persistAudiosIfNeeded).mockImplementation(async (voiceMessages) => voiceMessages);
  });

  it("renders the diary wall hero with correct title", async () => {
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("她在为你记录每一天")).toBeDefined();
    expect(screen.getByText("日记墙")).toBeDefined();
  });

  it("shows the '重新记录今天' refresh button when journal exists", async () => {
    const existingJournal = {
      id: "journal-2026-05-23",
      date: "2026-05-23",
      weekday: "周五",
      mood: "开心" as const,
      source: "girlfriend" as const,
      content: "今天的阳光很温暖。",
      voiceMessages: [] as import("../types/journal").VoiceMessage[],
    };
    render(<DiaryWallPage todayJournal={existingJournal} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "重新记录今天" })).toBeDefined();
  });

  it("shows '让她记录今天' primary button when no journal exists", async () => {
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "让她记录今天" })).toBeDefined();
  });

  it("shows mood and scene hint controls", async () => {
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("心情")).toBeDefined();
    expect(screen.getByLabelText("场景提示（可选）")).toBeDefined();
  });

  it("clicking '重新记录今天' triggers generation and replaces journal in place", async () => {
    const existingJournal = {
      id: "journal-2026-05-23",
      date: "2026-05-23",
      weekday: "周五",
      mood: "开心" as const,
      source: "girlfriend" as const,
      content: "今天的阳光很温暖。",
      voiceMessages: [] as import("../types/journal").VoiceMessage[],
    };
    const onRefresh = vi.fn();
    render(<DiaryWallPage todayJournal={existingJournal} onJournalRefresh={onRefresh} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    await waitFor(() => expect(generateDailyJournal).toHaveBeenCalled());
    await waitFor(() => expect(mockCreateGenerationTask).toHaveBeenCalled());

    // onJournalRefresh should be called with the new journal
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    const refreshedJournal = onRefresh.mock.calls[0][0] as { source: string };
    expect(refreshedJournal.source).toBe("girlfriend");
  });

  it("shows the regenerated journal content in place after refresh completes", async () => {
    const existingJournal = {
      id: "journal-2026-05-23",
      date: "2026-05-23",
      weekday: "周五",
      mood: "开心" as const,
      source: "girlfriend" as const,
      content: "旧内容",
      voiceMessages: [] as import("../types/journal").VoiceMessage[],
    };
    render(<DiaryWallPage todayJournal={existingJournal} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));

    await waitFor(() => expect(screen.getByText("她记录了这一天")).toBeDefined());
    // Should show new generated content, not old content
    await waitFor(() => expect(screen.getByText(/今天的阳光很温暖/)).toBeDefined());
  });

  it("refresh button label shows '记录中...' while generating", async () => {
    vi.mocked(generateDailyJournal).mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        journal: {
          id: "journal-test-1",
          date: "2026-05-23",
          weekday: "周五",
          mood: "开心",
          source: "girlfriend",
          content: "新内容",
          voiceMessages: [
            { id: "voice-morning", timing: "morning", transcript: "早安！", duration: "0:12" },
          ],
        },
      }), 50);
    }));

    const existingJournal = {
      id: "journal-2026-05-23",
      date: "2026-05-23",
      weekday: "周五",
      mood: "开心" as const,
      source: "girlfriend" as const,
      content: "旧内容",
      voiceMessages: [] as import("../types/journal").VoiceMessage[],
    };
    render(<DiaryWallPage todayJournal={existingJournal} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "记录中..." })).toBeDefined());
  });

  it("calls replaceJournalOnBackend after successful regeneration", async () => {
    const existingJournal = {
      id: "journal-2026-05-23",
      date: "2026-05-23",
      weekday: "周五",
      mood: "开心" as const,
      source: "girlfriend" as const,
      content: "旧内容",
      voiceMessages: [] as import("../types/journal").VoiceMessage[],
    };
    render(<DiaryWallPage todayJournal={existingJournal} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    await waitFor(() => expect(mockReplaceJournalOnBackend).toHaveBeenCalled());
  });

  it("shows journal content even when media generation partially fails", async () => {
    // Make task-based generation return incomplete output to trigger fallback
    mockPollGenerationTask.mockResolvedValueOnce({
      id: "tsk_dw_1",
      status: "succeeded",
      output: {
        images: [],
        voiceMessages: [],
      },
      error: null,
    });

    mockBuildJournalMedia = vi.fn((journal: import("../types/journal").Journal) => Promise.resolve({
      journal: {
        ...journal,
        images: [],
        voiceMessages: journal.voiceMessages,
      },
      errors: { image: "图片生成失败：网络错误", voice: undefined },
    }));

    const existingJournal = {
      id: "journal-2026-05-23",
      date: "2026-05-23",
      weekday: "周五",
      mood: "开心" as const,
      source: "girlfriend" as const,
      content: "旧内容",
      voiceMessages: [] as import("../types/journal").VoiceMessage[],
    };
    render(<DiaryWallPage todayJournal={existingJournal} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "重新记录今天" }));
    // Journal content should still appear even with partial media failure
    await waitFor(() => expect(screen.getByText("她记录了这一天")).toBeDefined());
  });

  it("returns to retry state on draft failure", async () => {
    vi.mocked(generateDailyJournal).mockRejectedValueOnce(new Error("网络错误"));

    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "让她记录今天" }));
    // After failure, button should return to "让她记录今天" (retry state) and journal placeholder is visible
    await waitFor(() => expect(screen.getByRole("button", { name: "让她记录今天" })).toBeDefined());
    await waitFor(() => expect(screen.getByText("她还没有记录今天")).toBeDefined());
  });

  it("onCancel returns home", async () => {
    const mockOnCancel = vi.fn();
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={mockOnCancel} />);

    // Use the last "返回首页" button (the one in action-row at the bottom)
    const cancelButtons = screen.getAllByRole("button", { name: "返回首页" });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("passes sceneHint into draft generation", async () => {
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("场景提示（可选）"), {
      target: { value: "看电影" },
    });

    fireEvent.click(screen.getByRole("button", { name: "让她记录今天" }));

    await waitFor(() => expect(generateDailyJournal).toHaveBeenCalledWith(
      expect.objectContaining({ sceneHint: "看电影" }),
    ));
  });

  it("displays OOTD card in the wall feed", async () => {
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("今日OOTD")).toBeDefined();
  });

  it("clicking '换一套' opens style picker and sends the selected style", async () => {
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("她今天想穿这套")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "换一套" }));
    expect(screen.getByRole("heading", { name: "今天想看她穿哪种风格？" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "老钱风" }));

    await waitFor(() => expect(regenerateOotd).toHaveBeenCalled());
    const today = new Date().toISOString().split("T")[0];
    expect(regenerateOotd).toHaveBeenCalledWith("local-user", today, "old_money");
  });

  it("displays greeting card in the wall feed", async () => {
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("今日问候")).toBeDefined();
  });

  it("clicking like button on outfit card submits ootd_reaction feedback with like_fullbody", async () => {
    const { submitCompanionFeedback } = await import("../services/api/companionClient");
    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("她今天想穿这套")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "喜欢这套" }));

    expect(submitCompanionFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackKind: "ootd_reaction",
        feedbackValue: "like_fullbody",
      }),
    );
  });

  it("clicking like button on makeup card submits ootd_reaction feedback with like_makeup", async () => {
    const { submitCompanionFeedback, fetchOotdByDate } = await import("../services/api/companionClient");
    vi.mocked(fetchOotdByDate).mockResolvedValueOnce({
      id: "ootd-dual",
      title: "今日OOTD",
      imageUrl: "https://example.com/ootd.jpg",
      caption: "OOTD caption",
      date: "2026-05-23",
      userId: "local-user",
      rationale: null,
      styleTags: [],
      createdAt: "",
      updatedAt: "",
      cards: [
        { id: "card-0", kind: "fullbody", imageUrl: "https://example.com/ootd.jpg", caption: "Outfit caption", liked: false },
        { id: "card-1", kind: "makeup", imageUrl: "https://example.com/makeup.jpg", caption: "Makeup caption", liked: false },
      ],
    });

    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("她今天想穿这套")).toBeDefined());
    await waitFor(() => expect(screen.getByText("近距离看看今天的妆")).toBeDefined());

    // Click the makeup card's like button
    fireEvent.click(screen.getByRole("button", { name: "喜欢这个妆" }));

    expect(submitCompanionFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackKind: "ootd_reaction",
        feedbackValue: "like_makeup",
      }),
    );
  });

  it("renders two separate OOTD wall items when OOTD has dual cards", async () => {
    const { fetchOotdByDate } = await import("../services/api/companionClient");
    vi.mocked(fetchOotdByDate).mockResolvedValueOnce({
      id: "ootd-dual",
      title: "今日OOTD",
      imageUrl: null,
      caption: null,
      date: "2026-05-23",
      userId: "local-user",
      rationale: null,
      styleTags: [],
      createdAt: "",
      updatedAt: "",
      cards: [
        { id: "card-0", kind: "fullbody", imageUrl: "https://example.com/ootd.jpg", caption: "Outfit caption", liked: false },
        { id: "card-1", kind: "makeup_closeup", imageUrl: "https://example.com/makeup.jpg", caption: "Makeup caption", liked: false },
      ],
    });

    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    // Should have two OOTD wall items in the feed
    await waitFor(() => expect(screen.getByText("今日OOTD")).toBeDefined());
    await waitFor(() => expect(screen.getByText("妆容特写")).toBeDefined());

    // Each should have its own like button
    await waitFor(() => expect(screen.getByRole("button", { name: "喜欢这套" })).toBeDefined());
    await waitFor(() => expect(screen.getByRole("button", { name: "喜欢这个妆" })).toBeDefined());
  });

  it("each OOTD card wall item submits correct feedback value based on card kind", async () => {
    const { submitCompanionFeedback, fetchOotdByDate } = await import("../services/api/companionClient");
    vi.mocked(fetchOotdByDate).mockResolvedValueOnce({
      id: "ootd-dual",
      title: "今日OOTD",
      imageUrl: null,
      caption: null,
      date: "2026-05-23",
      userId: "local-user",
      rationale: null,
      styleTags: [],
      createdAt: "",
      updatedAt: "",
      cards: [
        { id: "card-0", kind: "fullbody", imageUrl: "https://example.com/ootd.jpg", caption: "Outfit caption", liked: false },
        { id: "card-1", kind: "makeup_closeup", imageUrl: "https://example.com/makeup.jpg", caption: "Makeup caption", liked: false },
      ],
    });

    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "喜欢这套" })).toBeDefined());
    await waitFor(() => expect(screen.getByRole("button", { name: "喜欢这个妆" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "喜欢这套" }));
    expect(submitCompanionFeedback).toHaveBeenLastCalledWith(
      expect.objectContaining({ feedbackValue: "like_fullbody" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "喜欢这个妆" }));
    expect(submitCompanionFeedback).toHaveBeenLastCalledWith(
      expect.objectContaining({ feedbackValue: "like_makeup" }),
    );
  });

  it("renders returned avatar choice results in the wall feed", async () => {
    const { fetchAvatarPromptResults } = await import("../services/api/companionClient");
    vi.mocked(fetchAvatarPromptResults).mockResolvedValueOnce({
      results: [
        {
          id: "avr_1",
          promptId: "avp_1",
          resultKind: "avatar_choice_result",
          title: "你帮她选的结果回来了",
          body: "她最后穿了你选的白裙子，朋友还夸她看起来很温柔。",
          imageUrl: "https://example.com/outfit-result.jpg",
          metadata: { selectedOptionId: "white_dress" },
        },
      ],
    });

    render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText("你帮她选的结果回来了")).toBeDefined();
    expect(screen.getByText("她最后穿了你选的白裙子，朋友还夸她看起来很温柔。")).toBeDefined();
  });
});
