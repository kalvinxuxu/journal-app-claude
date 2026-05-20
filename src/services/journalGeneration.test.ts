import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createMemoryEngine } from "./generator/index";
import { generateJournalDraft } from "./journalGeneration";
import * as apiTaskClient from "./generation/apiTaskClient";
import * as taskPolling from "./generation/taskPolling";
import * as contentClient from "./api/contentClient";

describe("generateJournalDraft", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns journal content and voice messages together", async () => {
    // Mock task system so this test doesn't make real API calls
    vi.spyOn(apiTaskClient, "createGenerationTask").mockResolvedValue({
      task: {
        id: "tsk_test_1",
        status: "succeeded" as const,
        type: "draft_generation",
        input: {},
        output: {
          journalContent: "今天阳光很好，和他一起去公园散步。",
          voiceScripts: [
            { timing: "morning", transcript: "早安！", duration: "0:12" },
            { timing: "afternoon", transcript: "下午好", duration: "0:15" },
            { timing: "night", transcript: "晚安", duration: "0:18" },
          ],
        },
        error: null,
        resultSummary: null,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: new Date().toISOString(),
      },
      deduped: false,
    });
    vi.spyOn(taskPolling, "pollGenerationTask").mockResolvedValue({
      status: "succeeded" as const,
      output: {
        journalContent: "今天阳光很好，和他一起去公园散步。",
        voiceScripts: [
          { timing: "morning", transcript: "早安！", duration: "0:12" },
          { timing: "afternoon", transcript: "下午好", duration: "0:15" },
          { timing: "night", transcript: "晚安", duration: "0:18" },
        ],
      },
    });

    const engine = createMemoryEngine();

    const draft = await generateJournalDraft({
      mood: "开心",
      date: "2026-05-11",
      memoryEngine: engine,
    });

    expect(draft.content).toBeTruthy();
    expect(draft.voiceMessages).toHaveLength(3);
    expect(draft.voiceMessages[0].timing).toBe("morning");
  });

  it("includes memory hooks when a matching memory exists", async () => {
    const engine = createMemoryEngine();
    engine.addMemory({
      id: "memory-1",
      date: "2026-05-03",
      weekday: "周日",
      mood: "开心",
      content: "上次一起去喝咖啡的时候，你笑得特别好看。",
      voiceMessages: [],
    });

    const draft = await generateJournalDraft({
      mood: "开心",
      date: "2026-05-11",
      memoryEngine: engine,
    });

    expect(draft.content.length).toBeGreaterThanOrEqual(5);
    expect(draft.memoryActivated).toBe(true);
  });

  it("passes sceneHint to task-based generation flow", async () => {
    const engine = createMemoryEngine();
    const mockCreateTask = vi.spyOn(apiTaskClient, "createGenerationTask").mockResolvedValue({
      task: {
        id: "tsk_scenehint_test",
        status: "succeeded" as const,
        type: "draft_generation",
        input: {},
        output: {
          journalContent: "今天下雨了，想念我们一起撑伞的时候。",
          voiceScripts: [
            { timing: "morning", transcript: "早安，今天也在想你。", duration: "0:12" },
            { timing: "afternoon", transcript: "下午好，想你了。", duration: "0:15" },
            { timing: "night", transcript: "晚安，梦里见。", duration: "0:18" },
          ],
        },
        error: null,
        resultSummary: null,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: new Date().toISOString(),
      },
      deduped: false,
    });

    const mockPoll = vi.spyOn(taskPolling, "pollGenerationTask").mockResolvedValue({
      status: "succeeded" as const,
      output: {
        journalContent: "今天下雨了，想念我们一起撑伞的时候。",
        voiceScripts: [
          { timing: "morning", transcript: "早安，今天也在想你。", duration: "0:12" },
          { timing: "afternoon", transcript: "下午好，想你了。", duration: "0:15" },
          { timing: "night", transcript: "晚安，梦里见。", duration: "0:18" },
        ],
      },
    });

    const draft = await generateJournalDraft({
      mood: "想念",
      date: "2026-05-17",
      memoryEngine: engine,
      sceneHint: "今天下雨了，想念我们一起撑伞的时候",
    });

    expect(mockCreateTask).toHaveBeenCalled();
    const taskInput = mockCreateTask.mock.calls[0][0].input;
    expect(taskInput.sceneHint).toBe("今天下雨了，想念我们一起撑伞的时候");
    expect(draft.content).toContain("下雨");
  });

  it("passes sceneHint to fallback generateJournalContent call", async () => {
    const engine = createMemoryEngine();

    // Make task system throw so fallback is triggered
    vi.spyOn(apiTaskClient, "createGenerationTask").mockRejectedValue(new Error("Task system unavailable"));

    const mockGenerate = vi.spyOn(contentClient, "generateJournalContent").mockResolvedValue({
      journalContent: "雨天的记忆特别清晰。",
      voiceMessages: [
        { id: "v1", timing: "morning" as const, transcript: "早安", duration: "0:12" },
        { id: "v2", timing: "afternoon" as const, transcript: "下午好", duration: "0:15" },
        { id: "v3", timing: "night" as const, transcript: "晚安", duration: "0:18" },
      ],
      source: "fallback" as const,
    });

    const draft = await generateJournalDraft({
      mood: "想念",
      date: "2026-05-17",
      memoryEngine: engine,
      sceneHint: "雨中漫步",
    });

    expect(mockGenerate).toHaveBeenCalled();
    const fallbackInput = mockGenerate.mock.calls[0][0];
    expect(fallbackInput.sceneHint).toBe("雨中漫步");
  });
});