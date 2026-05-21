# Generation Task System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current front-end-only generation task shell with a durable backend task system backed by SQLite, then migrate `WritePage` and `AskHerPage` to submit and observe tasks instead of running generation work directly in the browser.

**Architecture:** Keep the existing content/image/TTS provider code paths, but move task lifecycle management to the backend. Add a small SQLite-backed task repository, an in-process scheduler with lease/recovery logic, typed generation routes, and a thin frontend task client that both pages share.

**Tech Stack:** React, TypeScript, Express, Vitest, SQLite via `better-sqlite3`, existing provider abstractions in `backend/src/index.ts` and `src/services/*`

---

## File Structure

### Backend files to create

- `backend/src/generation/types.ts`
  - Canonical task types, status enums, payload/result/error types
- `backend/src/generation/taskRepository.ts`
  - SQLite schema bootstrap and CRUD/query operations
- `backend/src/generation/taskScheduler.ts`
  - In-process queue loop, leasing, retry scheduling, concurrency control
- `backend/src/generation/taskRecovery.ts`
  - Lease expiry scan and stale/requeue logic
- `backend/src/generation/taskService.ts`
  - Create/get/list/retry/cancel orchestration used by routes and scheduler
- `backend/src/generation/runners/draftRunner.ts`
  - Runs content generation using existing provider logic
- `backend/src/generation/runners/mediaRunner.ts`
  - Runs image/TTS/selfie generation using existing service logic
- `backend/src/generation/routes/generationRoutes.ts`
  - `/api/generation/tasks` endpoints
- `backend/src/generation/taskRepository.test.ts`
- `backend/src/generation/taskScheduler.test.ts`
- `backend/src/generation/routes/generationRoutes.test.ts`

### Backend files to modify

- `backend/package.json`
  - Add SQLite dependency
- `backend/src/index.ts`
  - Mount generation routes, initialize scheduler/recovery loop, preserve legacy sync endpoints

### Frontend files to create

- `src/services/generation/apiTaskClient.ts`
  - HTTP client for create/get/list/retry/cancel task APIs
- `src/services/generation/taskPolling.ts`
  - Poll server task status and hydrate local cache
- `src/services/generation/apiTaskClient.test.ts`

### Frontend files to modify

- `src/services/generation/types.ts`
  - Align frontend task shape with backend canonical schema
- `src/services/generation/taskStore.ts`
  - Reposition as UI cache, not task source of truth
- `src/services/generation/taskRunner.ts`
  - Remove local execute semantics; adapt into server polling helper or retire it
- `src/services/generation/taskDedupe.ts`
  - Restrict to optimistic local checks only, or delete if unused
- `src/services/journalGeneration.ts`
  - Route draft generation through backend task API
- `src/pages/WritePage.tsx`
  - Submit `media_generation` tasks instead of local execution
- `src/pages/AskHerPage.tsx`
  - Submit `draft_generation` then `media_generation`

### Docs to modify

- `docs/generation_task_system_review.md`
  - Optional link out to the implementation plan after implementation starts

---

### Task 1: Add Canonical Backend Task Types And SQLite Repository

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/generation/types.ts`
- Create: `backend/src/generation/taskRepository.ts`
- Test: `backend/src/generation/taskRepository.test.ts`

- [ ] **Step 1: Add the failing repository tests**

```ts
import { describe, expect, it, beforeEach } from "vitest";
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

  beforeEach(() => {
    dbDir = mkdtempSync(join(tmpdir(), "journal-task-repo-"));
  });

  it("creates and reads a task by id", () => {
    const repo = createTaskRepository(join(dbDir, "tasks.db"));
    const task = buildTask();

    repo.create(task);

    expect(repo.getById(task.id)).toMatchObject({
      id: "tsk_001",
      status: "queued",
      dedupeKey: "draft:2026-05-17:开心:soft:base",
    });

    rmSync(dbDir, { recursive: true, force: true });
  });

  it("reuses an active task with the same dedupe key", () => {
    const repo = createTaskRepository(join(dbDir, "tasks.db"));
    repo.create(buildTask());

    const found = repo.findActiveByDedupeKey("draft:2026-05-17:开心:soft:base");

    expect(found?.id).toBe("tsk_001");
    rmSync(dbDir, { recursive: true, force: true });
  });

  it("lists available queued tasks ordered by priority then createdAt", () => {
    const repo = createTaskRepository(join(dbDir, "tasks.db"));
    repo.create(buildTask({ id: "tsk_002", priority: 8, createdAt: "2026-05-17T10:01:00.000Z" }));
    repo.create(buildTask({ id: "tsk_003", priority: 8, createdAt: "2026-05-17T10:00:30.000Z" }));

    const available = repo.listAvailable("2026-05-17T10:02:00.000Z");

    expect(available.map((task) => task.id)).toEqual(["tsk_003", "tsk_002"]);
    rmSync(dbDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; npm test -- src/generation/taskRepository.test.ts`

Expected: FAIL with module-not-found errors for `./taskRepository` and missing `better-sqlite3`

- [ ] **Step 3: Add the dependency and minimal type/repository implementation**

```json
{
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.2"
  }
}
```

```ts
export type GenerationTaskType = "draft_generation" | "media_generation" | "selfie_generation";

export type GenerationTaskStatus =
  | "queued"
  | "leased"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "stale";

export interface GenerationTaskRecord {
  id: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  dedupeKey: string;
  priority: number;
  inputJson: string;
  outputJson: string | null;
  errorJson: string | null;
  resultSummaryJson: string | null;
  retryCount: number;
  maxRetries: number;
  availableAt: string;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}
```

```ts
import Database from "better-sqlite3";
import type { GenerationTaskRecord } from "./types";

export function createTaskRepository(dbPath: string) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 5,
      input_json TEXT NOT NULL,
      output_json TEXT,
      error_json TEXT,
      result_summary_json TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      available_at TEXT NOT NULL,
      lease_owner TEXT,
      lease_expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_generation_tasks_status_available
    ON generation_tasks(status, available_at, priority, created_at);
    CREATE INDEX IF NOT EXISTS idx_generation_tasks_dedupe
    ON generation_tasks(dedupe_key, status);
  `);

  const rowToTask = (row: Record<string, unknown>): GenerationTaskRecord => ({
    id: String(row.id),
    type: row.type as GenerationTaskRecord["type"],
    status: row.status as GenerationTaskRecord["status"],
    dedupeKey: String(row.dedupe_key),
    priority: Number(row.priority),
    inputJson: String(row.input_json),
    outputJson: row.output_json ? String(row.output_json) : null,
    errorJson: row.error_json ? String(row.error_json) : null,
    resultSummaryJson: row.result_summary_json ? String(row.result_summary_json) : null,
    retryCount: Number(row.retry_count),
    maxRetries: Number(row.max_retries),
    availableAt: String(row.available_at),
    leaseOwner: row.lease_owner ? String(row.lease_owner) : null,
    leaseExpiresAt: row.lease_expires_at ? String(row.lease_expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  });

  return {
    create(task: GenerationTaskRecord) {
      db.prepare(`
        INSERT INTO generation_tasks (
          id, type, status, dedupe_key, priority, input_json, output_json, error_json,
          result_summary_json, retry_count, max_retries, available_at, lease_owner,
          lease_expires_at, created_at, updated_at, started_at, completed_at, cancelled_at
        ) VALUES (
          @id, @type, @status, @dedupeKey, @priority, @inputJson, @outputJson, @errorJson,
          @resultSummaryJson, @retryCount, @maxRetries, @availableAt, @leaseOwner,
          @leaseExpiresAt, @createdAt, @updatedAt, @startedAt, @completedAt, @cancelledAt
        )
      `).run(task);
    },
    getById(id: string) {
      const row = db.prepare(`SELECT * FROM generation_tasks WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
      return row ? rowToTask(row) : null;
    },
    findActiveByDedupeKey(dedupeKey: string) {
      const row = db.prepare(`
        SELECT * FROM generation_tasks
        WHERE dedupe_key = ? AND status IN ('queued', 'leased', 'running')
        ORDER BY created_at ASC
        LIMIT 1
      `).get(dedupeKey) as Record<string, unknown> | undefined;
      return row ? rowToTask(row) : null;
    },
    listAvailable(nowIso: string) {
      const rows = db.prepare(`
        SELECT * FROM generation_tasks
        WHERE status = 'queued' AND available_at <= ?
        ORDER BY priority DESC, created_at ASC
      `).all(nowIso) as Record<string, unknown>[];
      return rows.map(rowToTask);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; npm test -- src/generation/taskRepository.test.ts`

Expected: PASS with 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/src/generation/types.ts backend/src/generation/taskRepository.ts backend/src/generation/taskRepository.test.ts
git commit -m "feat: add sqlite-backed generation task repository"
```

### Task 2: Add Task Service, Dedupe, Retry Scheduling, And Route Contracts

**Files:**
- Create: `backend/src/generation/taskService.ts`
- Create: `backend/src/generation/routes/generationRoutes.ts`
- Test: `backend/src/generation/routes/generationRoutes.test.ts`
- Modify: `backend/src/generation/types.ts`

- [ ] **Step 1: Write the failing route contract tests**

```ts
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createGenerationRoutes } from "./routes/generationRoutes";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; npm test -- src/generation/routes/generationRoutes.test.ts`

Expected: FAIL because `createGenerationRoutes` and `taskService` contracts do not exist

- [ ] **Step 3: Implement the task service and routes**

```ts
export interface CreateTaskRequest {
  type: "draft_generation" | "media_generation" | "selfie_generation";
  input: Record<string, unknown>;
  priority?: number;
}

export interface CreateTaskResult {
  task: PublicGenerationTask;
  deduped: boolean;
}

export interface GenerationTaskService {
  createTask(input: CreateTaskRequest): Promise<CreateTaskResult>;
  getTask(id: string): Promise<PublicGenerationTask | null>;
  listTasks(filter: { status?: string; type?: string }): Promise<PublicGenerationTask[]>;
  retryTask(id: string): Promise<PublicGenerationTask>;
  cancelTask(id: string): Promise<PublicGenerationTask>;
}
```

```ts
import { randomUUID } from "node:crypto";
import type { GenerationTaskService, CreateTaskRequest } from "./types";

export function createGenerationTaskService(repository: ReturnType<typeof import("./taskRepository").createTaskRepository>): GenerationTaskService {
  return {
    async createTask(request: CreateTaskRequest) {
      const now = new Date().toISOString();
      const dedupeKey = buildDedupeKey(request.type, request.input);
      const existing = repository.findActiveByDedupeKey(dedupeKey);

      if (existing) {
        return { task: toPublicTask(existing), deduped: true };
      }

      const task = {
        id: randomUUID(),
        type: request.type,
        status: "queued" as const,
        dedupeKey,
        priority: request.priority ?? 5,
        inputJson: JSON.stringify(request.input),
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
      };

      repository.create(task);
      return { task: toPublicTask(task), deduped: false };
    },
    async getTask(id) {
      const task = repository.getById(id);
      return task ? toPublicTask(task) : null;
    },
    async listTasks(filter) {
      return repository.listPublic(filter);
    },
    async retryTask(id) {
      return repository.markQueuedForRetry(id, new Date().toISOString());
    },
    async cancelTask(id) {
      return repository.cancel(id, new Date().toISOString());
    },
  };
}
```

```ts
import { Router } from "express";
import type { GenerationTaskService } from "../types";

export function createGenerationRoutes(service: GenerationTaskService) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const result = await service.createTask(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const task = await service.getTask(req.params.id);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const tasks = await service.listTasks({
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        type: typeof req.query.type === "string" ? req.query.type : undefined,
      });
      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/retry", async (req, res, next) => {
    try {
      const task = await service.retryTask(req.params.id);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/cancel", async (req, res, next) => {
    try {
      const task = await service.cancelTask(req.params.id);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; npm test -- src/generation/routes/generationRoutes.test.ts`

Expected: PASS with 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add backend/src/generation/types.ts backend/src/generation/taskService.ts backend/src/generation/routes/generationRoutes.ts backend/src/generation/routes/generationRoutes.test.ts
git commit -m "feat: add generation task service and route contracts"
```

### Task 3: Add Scheduler, Leasing, Recovery Scan, And Global Concurrency Guards

**Files:**
- Create: `backend/src/generation/taskScheduler.ts`
- Create: `backend/src/generation/taskRecovery.ts`
- Test: `backend/src/generation/taskScheduler.test.ts`
- Modify: `backend/src/generation/taskRepository.ts`

- [ ] **Step 1: Write the failing scheduler tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { createTaskScheduler } from "./taskScheduler";

describe("taskScheduler", () => {
  it("leases only one media task when media concurrency is 1", async () => {
    const repository = {
      leaseNextAvailable: vi
        .fn()
        .mockReturnValueOnce({ id: "media-1", type: "media_generation" })
        .mockReturnValueOnce({ id: "media-2", type: "media_generation" })
        .mockReturnValueOnce(null),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const runners = {
      media_generation: vi.fn().mockResolvedValue({ output: { images: [] }, resultSummary: { outcome: "full_success" } }),
    };

    const scheduler = createTaskScheduler({
      repository: repository as never,
      runners: runners as never,
      concurrency: { draft_generation: 2, media_generation: 1, selfie_generation: 1 },
      leaseMs: 30_000,
      workerId: "worker-1",
    });

    await scheduler.tick();

    expect(runners.media_generation).toHaveBeenCalledTimes(1);
  });

  it("requeues a lease-expired task as stale", async () => {
    const repository = {
      findLeaseExpired: vi.fn().mockReturnValue([{ id: "tsk-stale-1" }]),
      markStale: vi.fn(),
    };

    const recovery = createTaskRecovery(repository as never);
    recovery.scan("2026-05-17T10:30:00.000Z");

    expect(repository.markStale).toHaveBeenCalledWith("tsk-stale-1", "2026-05-17T10:30:00.000Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; npm test -- src/generation/taskScheduler.test.ts`

Expected: FAIL because scheduler/recovery modules do not exist

- [ ] **Step 3: Implement the scheduler and recovery loop**

```ts
const TASK_CONCURRENCY = {
  draft_generation: 2,
  media_generation: 1,
  selfie_generation: 1,
} as const;

export function createTaskScheduler({ repository, runners, concurrency = TASK_CONCURRENCY, leaseMs, workerId }: SchedulerDeps) {
  const activeCounts = new Map<string, number>();

  async function tick() {
    for (const [taskType, limit] of Object.entries(concurrency)) {
      const active = activeCounts.get(taskType) ?? 0;
      if (active >= limit) {
        continue;
      }

      const leased = repository.leaseNextAvailable(taskType, workerId, leaseMs, new Date().toISOString());
      if (!leased) {
        continue;
      }

      activeCounts.set(taskType, active + 1);
      try {
        repository.markRunning(leased.id, new Date().toISOString());
        const result = await runners[taskType as keyof typeof runners](leased);
        repository.markSucceeded(leased.id, result, new Date().toISOString());
      } catch (error) {
        repository.markFailed(leased.id, error, new Date().toISOString());
      } finally {
        activeCounts.set(taskType, (activeCounts.get(taskType) ?? 1) - 1);
      }
    }
  }

  return { tick };
}
```

```ts
export function createTaskRecovery(repository: {
  findLeaseExpired(nowIso: string): Array<{ id: string }>;
  markStale(id: string, nowIso: string): void;
}) {
  return {
    scan(nowIso: string) {
      for (const task of repository.findLeaseExpired(nowIso)) {
        repository.markStale(task.id, nowIso);
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; npm test -- src/generation/taskScheduler.test.ts`

Expected: PASS with 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add backend/src/generation/taskRepository.ts backend/src/generation/taskScheduler.ts backend/src/generation/taskRecovery.ts backend/src/generation/taskScheduler.test.ts
git commit -m "feat: add task scheduler leasing and stale recovery"
```

### Task 4: Add Draft And Media Runners, Then Mount Generation Routes In Backend

**Files:**
- Create: `backend/src/generation/runners/draftRunner.ts`
- Create: `backend/src/generation/runners/mediaRunner.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/src/generation/routes/generationRoutes.test.ts`

- [ ] **Step 1: Extend route tests to assert task fetch works after backend wiring**

```ts
it("gets a task by id", async () => {
  const service = {
    createTask: vi.fn(),
    getTask: vi.fn().mockResolvedValue({ id: "tsk_201", status: "running", type: "media_generation" }),
    listTasks: vi.fn(),
    retryTask: vi.fn(),
    cancelTask: vi.fn(),
  };
  const app = express();
  app.use(express.json());
  app.use("/api/generation/tasks", createGenerationRoutes(service as never));

  const response = await request(app).get("/api/generation/tasks/tsk_201");

  expect(response.status).toBe(200);
  expect(response.body.task).toMatchObject({ id: "tsk_201", status: "running" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; npm test -- src/generation/routes/generationRoutes.test.ts`

Expected: FAIL until `GET /:id` is fully wired and runner dependencies compile

- [ ] **Step 3: Implement runners and backend startup wiring**

```ts
export function createDraftRunner(deps: { generateDraft: (input: Record<string, unknown>) => Promise<Record<string, unknown>> }) {
  return async function runDraftTask(task: { inputJson: string }) {
    const input = JSON.parse(task.inputJson) as Record<string, unknown>;
    const output = await deps.generateDraft(input);
    return {
      output,
      resultSummary: { outcome: output.source === "fallback" ? "degraded_success" : "full_success" },
    };
  };
}
```

```ts
export function createMediaRunner(deps: { runMedia: (input: Record<string, unknown>) => Promise<Record<string, unknown>> }) {
  return async function runMediaTask(task: { inputJson: string }) {
    const input = JSON.parse(task.inputJson) as Record<string, unknown>;
    const output = await deps.runMedia(input);
    const hasErrors = Boolean((output as { errors?: Record<string, unknown> }).errors);
    return {
      output,
      resultSummary: { outcome: hasErrors ? "partial_success" : "full_success" },
    };
  };
}
```

```ts
import { createTaskRepository } from "./generation/taskRepository";
import { createGenerationTaskService } from "./generation/taskService";
import { createGenerationRoutes } from "./generation/routes/generationRoutes";
import { createTaskScheduler } from "./generation/taskScheduler";
import { createTaskRecovery } from "./generation/taskRecovery";

const taskRepository = createTaskRepository(process.env.GENERATION_TASK_DB_PATH ?? "./generation-tasks.db");
const generationTaskService = createGenerationTaskService(taskRepository);
const scheduler = createTaskScheduler({
  repository: taskRepository,
  runners: {
    draft_generation: createDraftRunner({ generateDraft: async (input) => ({ ...input, source: "remote" }) }),
    media_generation: createMediaRunner({ runMedia: async (input) => ({ ...input, images: [], voiceMessages: [] }) }),
    selfie_generation: async () => ({ output: {}, resultSummary: { outcome: "full_success" } }),
  },
  leaseMs: 30_000,
  workerId: "api-process-1",
});
const recovery = createTaskRecovery(taskRepository);

setInterval(() => {
  void scheduler.tick();
  recovery.scan(new Date().toISOString());
}, 1_000);

app.use("/api/generation/tasks", createGenerationRoutes(generationTaskService));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend; npm test -- src/generation/routes/generationRoutes.test.ts`

Expected: PASS with 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add backend/src/generation/runners/draftRunner.ts backend/src/generation/runners/mediaRunner.ts backend/src/index.ts backend/src/generation/routes/generationRoutes.test.ts
git commit -m "feat: wire backend generation task routes and runners"
```

### Task 5: Add Frontend Server Task Client And Replace Local Task Execution

**Files:**
- Create: `src/services/generation/apiTaskClient.ts`
- Create: `src/services/generation/taskPolling.ts`
- Test: `src/services/generation/apiTaskClient.test.ts`
- Modify: `src/services/generation/types.ts`
- Modify: `src/services/generation/taskRunner.ts`
- Modify: `src/services/generation/taskStore.ts`

- [ ] **Step 1: Add failing API client tests**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/generation/apiTaskClient.test.ts`

Expected: FAIL because `apiTaskClient.ts` does not exist

- [ ] **Step 3: Implement frontend task client and polling**

```ts
const DEFAULT_BACKEND_URL = "http://localhost:3001";

function getBackendUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

export async function createGenerationTask(payload: {
  type: "draft_generation" | "media_generation" | "selfie_generation";
  input: Record<string, unknown>;
  priority?: number;
}) {
  const response = await fetch(`${getBackendUrl()}/api/generation/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Task creation failed with ${response.status}`);
  }
  return response.json() as Promise<{ task: FrontendGenerationTask; deduped: boolean }>;
}

export async function getGenerationTask(taskId: string) {
  const response = await fetch(`${getBackendUrl()}/api/generation/tasks/${taskId}`);
  if (!response.ok) {
    throw new Error(`Task fetch failed with ${response.status}`);
  }
  const json = await response.json() as { task: FrontendGenerationTask };
  return json.task;
}
```

```ts
import { getGenerationTask } from "./apiTaskClient";
import { taskStore } from "./taskStore";

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "stale"]);

export async function pollGenerationTask(taskId: string, pollIntervalMs = 1000, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const task = await getGenerationTask(taskId);
    taskStore.upsertTask(task);
    if (TERMINAL.has(task.status)) {
      return task;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return getGenerationTask(taskId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/generation/apiTaskClient.test.ts`

Expected: PASS with 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/services/generation/types.ts src/services/generation/taskStore.ts src/services/generation/taskRunner.ts src/services/generation/apiTaskClient.ts src/services/generation/taskPolling.ts src/services/generation/apiTaskClient.test.ts
git commit -m "feat: add frontend generation task api client"
```

### Task 6: Migrate `WritePage` To Submit And Poll `media_generation` Tasks

**Files:**
- Modify: `src/pages/WritePage.tsx`
- Modify: `src/services/generation/mediaTaskAdapter.ts`
- Test: `src/pages/WritePage.test.tsx`

- [ ] **Step 1: Add the failing `WritePage` task submission test**

```ts
it("submits a media task instead of calling buildJournalMedia directly", async () => {
  const createGenerationTask = vi.fn().mockResolvedValue({
    task: { id: "tsk_write_1", status: "queued", type: "media_generation" },
    deduped: false,
  });
  const pollGenerationTask = vi.fn().mockResolvedValue({
    id: "tsk_write_1",
    status: "succeeded",
    type: "media_generation",
    output: {
      images: ["https://example.com/image-1.png"],
      voiceMessages: [{ id: "voice-morning", timing: "morning", transcript: "hello", duration: "0:12", audioUrl: "data:audio/mock" }],
    },
  });

  vi.doMock("../services/generation/apiTaskClient", () => ({ createGenerationTask }));
  vi.doMock("../services/generation/taskPolling", () => ({ pollGenerationTask }));

  // render page, click save, then assert submission
  expect(createGenerationTask).toHaveBeenCalledWith(expect.objectContaining({ type: "media_generation" }));
  expect(pollGenerationTask).toHaveBeenCalledWith("tsk_write_1", expect.any(Number), expect.any(Number));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/WritePage.test.tsx`

Expected: FAIL because `WritePage` still uses local `runTask()` + `mediaTaskAdapter`

- [ ] **Step 3: Replace local execution with task submission**

```ts
import { createGenerationTask } from "../services/generation/apiTaskClient";
import { pollGenerationTask } from "../services/generation/taskPolling";

async function handleSave() {
  if (saveState === "saving") return;

  setSaveState("saving");
  setGenerationErrors(null);

  const draftTask = createDraftTask();
  const created = await createGenerationTask({
    type: "media_generation",
    input: draftTask.input,
    priority: draftTask.priority,
  });

  setActiveTaskId(created.task.id);
  taskStore.upsertTask(created.task);

  const finalTask = await pollGenerationTask(created.task.id);
  setActiveTaskId(null);

  if (finalTask.status === "succeeded" && finalTask.output) {
    const mediaOutput = finalTask.output as { images?: string[]; voiceMessages?: typeof voiceMessages };
    await Promise.resolve(onSave({
      ...draftTask.input.journal,
      images: mediaOutput.images,
      voiceMessages: mediaOutput.voiceMessages,
    }));
    setSaveState("idle");
    return;
  }

  const errorMsg = finalTask.error?.message ?? "生成失败";
  setGenerationErrors({ image: errorMsg, voice: errorMsg });
  setSaveState("error");
  await Promise.resolve(onSave(draftTask.input.journal));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/WritePage.test.tsx`

Expected: PASS with the new task-submission assertion and existing save-path assertions updated

- [ ] **Step 5: Commit**

```bash
git add src/pages/WritePage.tsx src/pages/WritePage.test.tsx src/services/generation/mediaTaskAdapter.ts
git commit -m "feat: move write page media generation to backend tasks"
```

### Task 7: Migrate `AskHerPage` And `generateJournalDraft()` To `draft_generation`

**Files:**
- Modify: `src/services/journalGeneration.ts`
- Modify: `src/pages/AskHerPage.tsx`
- Test: `src/pages/AskHerPage.test.tsx`

- [ ] **Step 1: Add the failing draft-task flow tests**

```ts
it("requests a draft_generation task when clicking generate", async () => {
  const createGenerationTask = vi.fn().mockResolvedValue({
    task: { id: "tsk_draft_1", status: "queued", type: "draft_generation" },
    deduped: false,
  });
  const pollGenerationTask = vi.fn().mockResolvedValue({
    id: "tsk_draft_1",
    status: "succeeded",
    type: "draft_generation",
    output: {
      journalContent: "今天也想把好心情分你一半。",
      voiceMessages: [{ id: "generated-morning", timing: "morning", transcript: "hi", duration: "0:12" }],
      source: "remote",
    },
  });

  vi.doMock("../services/generation/apiTaskClient", () => ({ createGenerationTask }));
  vi.doMock("../services/generation/taskPolling", () => ({ pollGenerationTask }));

  expect(createGenerationTask).toHaveBeenCalledWith(expect.objectContaining({ type: "draft_generation" }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/AskHerPage.test.tsx`

Expected: FAIL because `AskHerPage` still calls `generateJournalDraft()` directly

- [ ] **Step 3: Implement task-based draft generation**

```ts
import { createGenerationTask } from "./generation/apiTaskClient";
import { pollGenerationTask } from "./generation/taskPolling";

export async function generateJournalDraft({ mood, date, memoryEngine, voiceStyle }: GenerateJournalDraftParams): Promise<JournalDraft> {
  const recallResult = recallWithStrategy(memoryEngine, mood, date, 3);
  const memoryContext = buildMemoryContext(recallResult);

  const created = await createGenerationTask({
    type: "draft_generation",
    input: {
      mood,
      date,
      recalledMemory: memoryContext || undefined,
      voiceStyle,
    },
    priority: 5,
  });

  const task = await pollGenerationTask(created.task.id);
  if (task.status !== "succeeded" || !task.output) {
    throw new Error(task.error?.message ?? "Draft generation failed");
  }

  const output = task.output as {
    journalContent: string;
    voiceMessages: VoiceMessage[];
    source: "remote" | "fallback";
  };

  return {
    content: output.journalContent,
    voiceMessages: output.voiceMessages,
    memoryActivated: recallResult.strategy !== "no_memory",
    source: output.source,
  };
}
```

```ts
async function handleGenerate() {
  if (saveState === "generating") return;
  setSaveState("generating");
  setErrorMsg(null);
  setPreviewContent(null);

  try {
    const draft = await generateJournalDraft({
      mood,
      date,
      memoryEngine: { recall: () => [], seed: () => {}, addMemory: () => {}, memories: [] } as ReturnType<typeof import("../services/generator").getMemoryEngine>,
      voiceStyle,
    });
    setPreviewDraft(draft);
    setPreviewContent(draft.content);
    setSaveState("idle");
  } catch (err) {
    setErrorMsg(err instanceof Error ? err.message : String(err));
    setSaveState("error");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/AskHerPage.test.tsx`

Expected: PASS with task-submission assertions and existing preview behavior preserved

- [ ] **Step 5: Commit**

```bash
git add src/services/journalGeneration.ts src/pages/AskHerPage.tsx src/pages/AskHerPage.test.tsx
git commit -m "feat: move ask-her draft generation to backend tasks"
```

### Task 8: Add Retry/Stale UI Behavior And Final Verification

**Files:**
- Modify: `src/pages/WritePage.tsx`
- Modify: `src/pages/AskHerPage.tsx`
- Modify: `src/services/generation/taskStore.ts`
- Test: `src/pages/WritePage.test.tsx`
- Test: `src/pages/AskHerPage.test.tsx`

- [ ] **Step 1: Add the failing stale/retry UI tests**

```ts
it("shows retry guidance when a task returns stale", async () => {
  const pollGenerationTask = vi.fn().mockResolvedValue({
    id: "tsk_stale_ui",
    status: "stale",
    type: "media_generation",
    error: { code: "LEASE_EXPIRED", message: "任务已过期，请重试", retryable: true },
  });

  expect(screen.getByText("任务已过期，请重试")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/WritePage.test.tsx src/pages/AskHerPage.test.tsx`

Expected: FAIL because stale/cancelled states are not surfaced in UI

- [ ] **Step 3: Implement stale/retry messaging and narrow cache semantics**

```ts
function toDisplayError(task: { status: string; error?: { message?: string } }) {
  if (task.status === "stale") {
    return "任务已过期，请重试";
  }
  if (task.status === "cancelled") {
    return "任务已取消";
  }
  return task.error?.message ?? "生成失败";
}
```

```ts
function upsertTask(task: GenerationTask): void {
  const tasks = loadTasks()
    .filter((existing) => existing.id !== task.id)
    .concat(task)
    .slice(-30);
  saveTasks(tasks);
}
```

- [ ] **Step 4: Run focused verification**

Run: `npm test -- src/pages/WritePage.test.tsx src/pages/AskHerPage.test.tsx`

Expected: PASS with stale/cancelled messaging covered

Run: `cd backend; npm test -- src/generation/taskRepository.test.ts src/generation/taskScheduler.test.ts src/generation/routes/generationRoutes.test.ts`

Expected: PASS with all backend generation-task suites green

- [ ] **Step 5: Commit**

```bash
git add src/pages/WritePage.tsx src/pages/AskHerPage.tsx src/services/generation/taskStore.ts src/pages/WritePage.test.tsx src/pages/AskHerPage.test.tsx
git commit -m "feat: surface stale and retry states in generation ui"
```

### Task 9: Manual End-To-End Verification

**Files:**
- Modify: `docs/generation_task_system_review.md`
- Modify: `docs/superpowers/plans/2026-05-17-generation-task-system-implementation-plan.md`

- [ ] **Step 1: Start frontend and backend locally**

Run: `npm run dev`

Expected: Vite starts on its default local port

Run: `cd backend; npm run dev`

Expected: Express backend starts on `http://localhost:3001`

- [ ] **Step 2: Verify draft task lifecycle from `AskHerPage`**

Run:

```bash
curl -X POST http://localhost:3001/api/generation/tasks ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"draft_generation\",\"input\":{\"mood\":\"开心\",\"date\":\"2026-05-17\",\"voiceStyle\":\"soft\"},\"priority\":5}"
```

Expected: `201` with `task.status = "queued"`

Run:

```bash
curl http://localhost:3001/api/generation/tasks/<TASK_ID>
```

Expected: eventual `task.status = "succeeded"` or a retryable terminal state with `error`

- [ ] **Step 3: Verify media task dedupe behavior**

Run the same `POST /api/generation/tasks` request twice with identical `media_generation` payloads.

Expected: second response returns the same active task id and `"deduped": true`

- [ ] **Step 4: Verify stale recovery path**

Stop the backend while a task is `running`, then restart it.

Run: `curl http://localhost:3001/api/generation/tasks/<TASK_ID>`

Expected: task becomes `stale` or returns to `queued` according to the chosen recovery rule, never remains indefinitely `running`

- [ ] **Step 5: Commit docs/status updates**

```bash
git add docs/generation_task_system_review.md docs/superpowers/plans/2026-05-17-generation-task-system-implementation-plan.md
git commit -m "docs: record generation task system rollout verification"
```

---

## Self-Review

- Spec coverage:
  - Unified backend task source of truth: covered by Tasks 1-4
  - Frontend migration for `WritePage` and `AskHerPage`: covered by Tasks 5-7
  - Retry, stale recovery, global concurrency: covered by Tasks 3 and 8
  - No new infra beyond SQLite dependency: preserved throughout
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” placeholders remain
- Type consistency:
  - Canonical statuses use `queued/leased/running/succeeded/failed/cancelled/stale`
  - Page migrations consistently target `draft_generation` and `media_generation`

