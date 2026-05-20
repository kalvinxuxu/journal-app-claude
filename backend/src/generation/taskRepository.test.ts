import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTaskRepository } from "./taskRepository";
import type { GenerationTaskRecord } from "./types";

function buildTask(overrides: Partial<GenerationTaskRecord> = {}): GenerationTaskRecord {
  const now = "2026-05-17T10:00:00.000Z";
  return {
    id: "tsk_001",
    type: "draft_generation",
    status: "queued",
    dedupeKey: "draft:2026-05-17:开心:soft:base",
    priority: 5,
    inputJson: JSON.stringify({ mood: "开心", date: "2026-05-17" }),
    outputJson: null,
    errorJson: null,
    resultSummaryJson: null,
    retryCount: 0,
    maxRetries: 3,
    availableAt: now,
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("taskRepository", () => {
  let dbDir: string;
  let dbPath: string;

  beforeEach(() => {
    dbDir = mkdtempSync(join(tmpdir(), "journal-task-repo-"));
    dbPath = join(dbDir, "tasks.db");
  });

  afterEach(() => {
    try {
      rmSync(dbDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("creates and reads a task by id", () => {
    const repo = createTaskRepository(dbPath);
    const task = buildTask();

    repo.create(task);

    expect(repo.getById(task.id)).toMatchObject({
      id: "tsk_001",
      status: "queued",
      dedupeKey: "draft:2026-05-17:开心:soft:base",
    });
  });

  it("reuses an active task with the same dedupe key", () => {
    const repo = createTaskRepository(dbPath);
    repo.create(buildTask());

    const found = repo.findActiveByDedupeKey("draft:2026-05-17:开心:soft:base");

    expect(found?.id).toBe("tsk_001");
  });

  it("lists available queued tasks ordered by priority then createdAt", () => {
    const repo = createTaskRepository(dbPath);
    repo.create(buildTask({ id: "tsk_002", priority: 8, createdAt: "2026-05-17T10:01:00.000Z" }));
    repo.create(buildTask({ id: "tsk_003", priority: 8, createdAt: "2026-05-17T10:00:30.000Z" }));

    const available = repo.listAvailable("2026-05-17T10:02:00.000Z");

    expect(available.map((task) => task.id)).toEqual(["tsk_003", "tsk_002"]);
  });

  it("finds a running task whose lease has expired", () => {
    const repo = createTaskRepository(dbPath);
    repo.create(buildTask({
      id: "tsk_running_expired",
      status: "running",
      leaseOwner: "worker-1",
      leaseExpiresAt: "2026-05-17T10:00:10.000Z",
      startedAt: "2026-05-17T10:00:00.000Z",
    }));

    const expired = repo.findLeaseExpired("2026-05-17T10:01:00.000Z");

    expect(expired.map((task) => task.id)).toContain("tsk_running_expired");
  });
});
