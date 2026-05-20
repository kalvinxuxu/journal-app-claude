import { describe, expect, it, vi, beforeEach } from "vitest";
import { createGenerationTask, getGenerationTask } from "./apiTaskClient";

describe("apiTaskClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a generation task", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task: { id: "tsk_front_1", status: "queued", type: "draft_generation" },
        deduped: false,
      }),
    }));

    const result = await createGenerationTask({
      type: "draft_generation",
      input: { mood: "开心", date: "2026-05-17" },
      priority: 5,
    });

    expect(result.task.id).toBe("tsk_front_1");
    expect(result.deduped).toBe(false);
  });

  it("gets a task by id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task: { id: "tsk_front_2", status: "running", type: "media_generation" },
      }),
    }));

    const task = await getGenerationTask("tsk_front_2");

    expect(task.status).toBe("running");
  });
});