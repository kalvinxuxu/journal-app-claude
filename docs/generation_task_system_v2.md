# Journal App 生成任务系统（优化版）

> 项目：虚拟女友日记 App / Journal App
> 日期：2026-05-16
> 版本：v2.0（优化版）

---

# 1. 背景

当前 App 的 TTS、图片、AI 内容生成都是同步模式，存在网络不稳定、页面刷新丢失状态、无法重试、并发风暴等问题。

---

# 2. 当前状态

## 已完成 ✅

| 模块 | 状态 |
|------|------|
| 前端 fetch + retry | ✅ `fetchWithRetry` (3次 + 指数退避) |
| TTS 并发控制 | ✅ `concurrencyLimit = 2` |
| 后端 API | ✅ `/api/tts`, `/api/image-generation` 同步 |
| Provider 抽象 | ✅ DeepSeek/MiniMax |
| 内容生成 API | ✅ `/api/content-generation` |

## 缺失 ❌

| 功能 | 当前表现 |
|------|------|
| 任务状态 | 无，UI 同步等待 |
| 页面刷新恢复 | 无，刷新后任务丢失 |
| 后端异步队列 | 无，同步处理 |
| 数据库持久化 | 无，backend 重启任务丢失 |
| 任务去重 | 无，快速点击创建多个相同任务 |

---

# 3. 架构原则

1. **渐进式改造** - 不破坏现有同步路径，作为 fallback 保留
2. **前端任务层先行** - Phase 1 只改前端，后端保持同步
3. **媒体生成作为整体** - image + voice 不拆分，共享同一任务
4. **独立 Worker** - Phase 4 起的 worker 是独立进程，不占用 API server
5. **可切换的后端** - 前端 taskRunner 抽象，后端可切换同步/异步模式

---

# 4. 任务类型定义

```ts
type TaskType = "media" | "content" | "selfie";

interface GenerationTask {
  id: string;                    // UUID v4
  type: TaskType;
  status: TaskStatus;
  priority: number;              // 1-10, 越高越先
  input: TaskInput;
  output?: TaskOutput;
  error?: TaskError;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

type TaskStatus = "pending" | "running" | "success" | "failed";
```

---

# 5. 实施阶段

## Phase 1：前端轻量任务层

**目标**：不改后端，增加前端任务状态管理 + localStorage 持久化

**目录结构**：
```
src/services/generation/
  types.ts           # 任务类型定义
  taskStore.ts       # localStorage 读写
  taskRunner.ts      # 任务执行器
  taskDedupe.ts      # 去重逻辑
  mediaTaskAdapter.ts # 适配现有 buildJournalMedia
```

**子任务**：

### Task 1.1：类型定义
- `GenerationTask` 接口
- `TaskStatus`, `TaskType` 类型
- 错误类型 `TaskError`

### Task 1.2：taskStore（localStorage 持久化）
```ts
interface TaskStore {
  loadTasks(): GenerationTask[];
  saveTasks(tasks: GenerationTask[]): void;
  upsertTask(task: GenerationTask): void;
  getTask(id: string): GenerationTask | null;
  deleteTask(id: string): void;
  getTasksByStatus(status: TaskStatus): GenerationTask[];
  getTasksByType(type: TaskType): GenerationTask[];
}
```

### Task 1.3：taskDedupe（去重）
```ts
interface DedupeKey {
  type: TaskType;
  // 根据 type 不同，key 不同
  // media: { mood, date, voiceStyle }
  // content: { mood, date }
  // selfie: { mood, referenceImage? }
}

function getDedupeKey(task: GenerationTask): string;
function findDuplicate(tasks: GenerationTask[], newTask: Partial<GenerationTask>): GenerationTask | null;
```

### Task 1.4：taskRunner（任务执行）
```ts
interface TaskRunnerOptions {
  onStatusChange?: (task: GenerationTask) => void;
  onError?: (task: GenerationTask, error: Error) => void;
  pollIntervalMs?: number;
}

async function runTask(task: GenerationTask, options: TaskRunnerOptions): Promise<void>;
async function pollTaskStatus(taskId: string): Promise<GenerationTask>;
```

**执行流程**：
```
创建任务 → 检查重复 → 保存到 store → 执行任务 → 更新状态 → 通知 UI
```

### Task 1.5：mediaTaskAdapter（适配现有逻辑）
```ts
// 适配 buildJournalMedia 到 taskRunner
async function executeMediaTask(task: GenerationTask): Promise<GenerationTask>;
```

### Task 1.6：WritePage 集成
- 改 `handleSave()` 为创建任务 + 轮询
- 保留同步 fallback：检测后端是否支持 task API，不支持则走原逻辑
- 显示任务状态 UI

### Task 1.7：App 启动恢复
- `App.tsx` 初始化时恢复 `taskStore`
- 检查 `running` 状态任务，标记为 `stale`

---

## Phase 2：后端任务系统

**目标**：后端异步执行，前端轮询状态

**目录结构**：
```
backend/src/
  generation/
    types.ts
    taskStore.ts       # Map<id, Task> 内存存储
    taskQueue.ts       # 简单内存队列
    taskRunner.ts      # 任务执行器
    runners/
      mediaRunner.ts   # image + voice
      contentRunner.ts
      selfieRunner.ts
    routes/
      generationRoutes.ts
```

**API 设计**：

```
POST /api/generation/tasks
  Body: { type, priority, input }
  Response: { task: GenerationTask }

GET /api/generation/tasks/:id
  Response: { task: GenerationTask }

POST /api/generation/tasks/:id/retry
  Response: { task: GenerationTask }

GET /api/generation/tasks?status=pending&type=media
  Response: { tasks: GenerationTask[] }

POST /api/generation/tasks/:id/cancel  // Phase 5 扩展
  Response: { task: GenerationTask }
```

**子任务**：

### Task 2.1：后端 taskStore（内存）
```ts
class InMemoryTaskStore {
  private tasks = new Map<string, GenerationTask>();

  create(task: GenerationTask): GenerationTask;
  get(id: string): GenerationTask | undefined;
  update(id: string, updates: Partial<GenerationTask>): GenerationTask | undefined;
  list(filter?: { status?: TaskStatus; type?: TaskType }): GenerationTask[];
  delete(id: string): boolean;
}
```

### Task 2.2：后端 taskQueue（内存队列）
```ts
class SimpleTaskQueue {
  private pending: GenerationTask[] = [];
  private running = new Map<string, GenerationTask>();

  enqueue(task: GenerationTask): void;
  dequeue(): GenerationTask | undefined;
  markRunning(taskId: string): void;
  markComplete(taskId: string): void;
  markFailed(taskId: string, error: TaskError): void;
  getRunning(): GenerationTask[];
  getPending(): GenerationTask[];
}
```

### Task 2.3：Media Runner
```ts
// 将 buildJournalMedia 封装为 runner
async function runMediaTask(task: GenerationTask): Promise<GenerationTask> {
  // 调用现有 buildJournalMedia
  // 捕获错误，更新 task 状态
}
```

### Task 2.4：Generation Routes
- 实现 `POST /api/generation/tasks`
- 实现 `GET /api/generation/tasks/:id`
- 实现 `POST /api/generation/tasks/:id/retry`
- 轮询端点 `GET /api/generation/tasks/:id` 可被前端轮询

### Task 2.5：Worker 循环
```ts
// 在 backend 主进程或独立 worker 中运行
async function startWorker(queue: SimpleTaskQueue, store: InMemoryTaskStore) {
  while (true) {
    const task = queue.dequeue();
    if (!task) {
      await sleep(1000);
      continue;
    }
    queue.markRunning(task.id);
    try {
      await runTask(task);
      queue.markComplete(task.id);
    } catch (error) {
      queue.markFailed(task.id, error);
    }
  }
}
```

---

## Phase 3：数据库持久化

**目标**：backend 重启不丢失任务

**技术选择**：
- 开发阶段：`better-sqlite3`（同步 API，轻量）
- 生产阶段：可迁移到 `Postgres`

**数据表**：
```sql
CREATE TABLE generation_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  input_json TEXT NOT NULL,
  output_json TEXT,
  error_json TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  INDEX idx_status (status),
  INDEX idx_type (type)
);
```

**子任务**：

### Task 3.1：SQLite 连接管理
```ts
// src/db/index.ts
import Database from 'better-sqlite3';

const db = new Database('tasks.db');

// 初始化表
db.exec(CREATE_TABLE_SQL);

export { db };
```

### Task 3.2：taskStore 改用 SQLite
```ts
class SqliteTaskStore {
  create(task: GenerationTask): GenerationTask;
  get(id: string): GenerationTask | undefined;
  update(id: string, updates: Partial<GenerationTask>): GenerationTask | undefined;
  list(filter?: { status?: TaskStatus; type?: TaskType }): GenerationTask[];
  delete(id: string): boolean;
}
```

### Task 3.3：任务恢复机制
- backend 启动时扫描 `running` 状态任务
- 标记为 `failed`（因为上次运行中断，无法确认状态）
- 记录原始 `startedAt` 供审计

---

## Phase 4：BullMQ + Redis

**目标**：支持高并发、分布式 worker、延迟重试

**架构**：
```
API Server (Express)
    ↓ enqueue
Redis (BullMQ)
    ↓ dequeue
Worker Process (独立 Node 进程)
    ↓
Minimax / Z-Image / DeepSeek
```

**队列配置**：
```ts
const queues = {
  media: { concurrency: 2, maxRetries: 3 },
  content: { concurrency: 2, maxRetries: 2 },
  selfie: { concurrency: 1, maxRetries: 2 },
};
```

**子任务**：

### Task 4.1：Redis 连接
```ts
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

### Task 4.2：BullMQ Queue 设置
```ts
import { Queue, Worker } from 'bullmq';

const mediaQueue = new Queue('media-generation', { connection: redis });

// 添加任务
await mediaQueue.add('generate', taskInput, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  priority: task.priority,
});
```

### Task 4.3：Worker 进程
```ts
// worker.ts - 独立进程
const mediaWorker = new Worker('media-generation', async job => {
  const task = await store.get(job.data.taskId);
  await runMediaTask(task);
}, { connection: redis, concurrency: 2 });
```

### Task 4.4：API Server 改造
- `POST /api/generation/tasks` 改为 enqueue 到 BullMQ
- 不再在 API server 内直接执行任务

---

## Phase 5：高级能力

### Task 5.1：WebSocket 实时推送

**方案**：使用 `Socket.IO` 或原生 `WebSocket`

```ts
// Server
import { Server } from 'socket.io';
const io = new Server(server);

io.on('connection', (socket) => {
  socket.join(`task:${taskId}`);
});

// 任务状态变化时
io.to(`task:${taskId}`).emit('task:updated', task);
```

**前端**：
```ts
// 替代轮询
socket.on('task:updated', (task) => {
  updateTaskInStore(task);
});
```

### Task 5.2：任务进度上报

**定义进度阶段**（以图片生成为例）：
```ts
type MediaProgress = {
  stage: "pending" | "uploading" | "generating" | "processing" | "completed";
  progress: number; // 0-100
  message?: string;
};
```

**Backend 上报**：
```ts
// 在 mediaRunner 中
io.to(`task:${taskId}`).emit('task:progress', { progress: 50, message: 'AI 生成中...' });
```

### Task 5.3：取消任务

**流程**：
```
用户点击取消 → POST /api/tasks/:id/cancel
    → 标记 task.status = 'cancelled'
    → 如果 running，通知 worker 中断
    → worker 检查状态，停止执行
```

**实现**：
```ts
// 在 worker 中
async function runMediaTask(task: GenerationTask) {
  // 检查是否被取消
  const currentTask = await store.get(task.id);
  if (currentTask.status === 'cancelled') {
    return; // 提前退出
  }
  // 继续执行...
}
```

### Task 5.4：优先级队列

BullMQ 原生支持优先级：
```ts
await queue.add('generate', taskInput, {
  priority: task.priority, // 1-10, 越小越先
});
```

### Task 5.5：任务历史页

**UI**：
- 显示所有任务（分页）
- 筛选：status, type, date
- 查看详情：input, output, error, retry history

---

# 6. 关键决策

## Q1: Phase 1 范围是 TTS 还是整个 media？

**决策**：整个 media 生成（image + voice）作为整体

**理由**：
- `WritePage.handleSave()` 调用 `buildJournalMedia()` 同时处理 image + voice
- 拆分会导致状态不一致
- 等到 Phase 2 后端支持后再考虑拆分

**Fallback 策略**：
- Phase 1 前端 taskRunner 检测后端能力
- 如果 `/api/generation/tasks` 不存在，降级到同步调用

## Q2: 任务去重策略？

**决策**：基于 type + 主要参数生成 dedupe key

```ts
// media 任务
const dedupeKey = `${type}:${mood}:${date}:${voiceStyle}`;

// 如果存在相同 key 的 pending/running 任务，返回现有任务
```

**优势**：防止用户快速点击创建多个任务

## Q3: Phase 4 worker 是独立进程还是同一进程？

**决策**：独立进程

**理由**：
- 不阻塞 API server
- 可独立扩展
- 崩溃不影响主服务

## Q4: Phase 3 SQLite vs Postgres？

**决策**：Phase 3 用 `better-sqlite3`，Phase 4 保留 Redis 时考虑迁移到 Postgres

**理由**：
- 开发阶段轻量，无需额外服务
- Phase 4 已有 Redis，可考虑 Redis Streams 替代部分 Postgres 功能

---

# 7. 验收标准

## Phase 1

| 功能 | 标准 |
|------|------|
| TTS 有任务状态 | pending → running → success/failed |
| 页面刷新不丢失 | localStorage 持久化，App 重启恢复 |
| retry 可用 | failed 任务可重新执行 |
| running 时禁止重复点击 | 检查 deduplicate |
| failed 时显示错误 | UI 显示错误信息 |

## Phase 2

| 功能 | 标准 |
|------|------|
| 后端异步执行 | API 立即返回 task，不阻塞 |
| 前端能轮询状态 | `GET /api/tasks/:id` 返回最新状态 |
| 后端能保存任务状态 | 内存 Map 存储 |
| retry 可用 | `POST /api/tasks/:id/retry` |
| 多个 TTS 不并发风暴 | 队列顺序执行或限流 |

## Phase 3

| 功能 | 标准 |
|------|------|
| backend 重启后任务仍存在 | SQLite 持久化 |
| success task 可重新读取 | 从 DB 读取 output |
| failed task 可 retry | 从 DB 读取 error |
| running task 恢复 | 标记为 stale 并可 retry |

## Phase 4

| 功能 | 标准 |
|------|------|
| BullMQ 队列工作 | 任务进入 Redis 队列 |
| worker 独立运行 | worker 进程消费队列 |
| retry 自动执行 | BullMQ 失败重试 |
| 并发控制生效 | media concurrency=2 |

## Phase 5

| 功能 | 标准 |
|------|------|
| WebSocket 实时更新 | 状态变化推送到前端 |
| 可取消任务 | 取消正在执行的任务 |
| 任务历史页 | 查看所有历史任务 |
| 优先级 | 高优先级任务先执行 |

---

# 8. 推荐实施顺序

```
Week 1: Phase 1（前端任务层 - media generation）
Week 2: Phase 2（后端异步任务系统）
Week 3: Phase 3（SQLite 持久化）
Week 4: Phase 4（BullMQ + Redis）
Week 5: Phase 5（WebSocket + 取消 + 历史）
```

---

# 9. 风险和缓解

| 风险 | 缓解 |
|------|------|
| Phase 1 破坏现有功能 | 保留同步 fallback，检测后端能力降级 |
| Phase 2 任务丢失 | Phase 3 前任务存在内存，有丢失风险，提前排入计划 |
| Phase 4 Redis 单点 | 后续可加 Redis Cluster（Phase 5 后） |
| Phase 5 WebSocket 重连 | 前端实现断线重连 + 状态同步 |

---

# 10. 文件清单

## Phase 1 新增

```
src/services/generation/
  types.ts
  taskStore.ts
  taskRunner.ts
  taskDedupe.ts
  mediaTaskAdapter.ts
```

## Phase 2 新增

```
backend/src/generation/
  types.ts
  taskStore.ts
  taskQueue.ts
  taskRunner.ts
  runners/
    mediaRunner.ts
    contentRunner.ts
    selfieRunner.ts
  routes/
    generationRoutes.ts
```

## Phase 3 修改

```
backend/src/generation/
  taskStore.ts → 改用 SQLite
backend/src/
  db/
    index.ts
```

## Phase 4 修改

```
backend/src/
  worker/
    index.ts
```

---

# 11. 结论

优化版相比原版：

1. **Phase 1 范围扩大**：从 TTS 改为整个 media generation（image + voice）
2. **增加去重逻辑**：防止快速点击问题
3. **明确 Phase 4 Worker 架构**：独立进程 vs 同一进程
4. **增加 Fallback 策略**：Phase 1 不支持时降级到同步
5. **明确 SQLite 技术选型**：better-sqlite3
6. **增加 Phase 5 取消任务协议**：详细设计
7. **增加进度上报**：Phase 5 支持

原计划文件路径：`c:\Users\kalvi\Downloads\generation_task_system_implementation_plan_20260516.md`