import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createGenerationRoutes } from "./generationRoutes";

describe("generation routes", () => {
  it("creates a task and returns dedupe metadata", async () => {
    const service = {
      createTask: vi.fn().mockResolvedValue({
        task: { id: "tsk_100", status: "queued", type: "draft_generation" },
        deduped: false,
      }),
      getTask: vi.fn(),
      listTasks: vi.fn(),
      retryTask: vi.fn(),
      cancelTask: vi.fn(),
    };
    const app = express();
    app.use(express.json());
    app.use("/api/generation/tasks", createGenerationRoutes(service as never));

    const response = await request(app)
      .post("/api/generation/tasks")
      .send({ type: "draft_generation", input: { mood: "开心", date: "2026-05-17" }, priority: 5 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      task: { id: "tsk_100", status: "queued", type: "draft_generation" },
      deduped: false,
    });
  });

  it("retries an existing task", async () => {
    const service = {
      createTask: vi.fn(),
      getTask: vi.fn(),
      listTasks: vi.fn(),
      retryTask: vi.fn().mockResolvedValue({
        id: "tsk_101",
        status: "queued",
        retryCount: 1,
      }),
      cancelTask: vi.fn(),
    };
    const app = express();
    app.use(express.json());
    app.use("/api/generation/tasks", createGenerationRoutes(service as never));

    const response = await request(app).post("/api/generation/tasks/tsk_101/retry").send();

    expect(response.status).toBe(200);
    expect(response.body.task).toMatchObject({ id: "tsk_101", status: "queued", retryCount: 1 });
  });
});