# Journal App 生成任务系统 Review（面向现有项目的稳健化改造）

> 项目：Journal App / 虚拟女友日记 App
> 日期：2026-05-17
> 基线约束：不新增 Redis / Postgres 等基础设施，优先复用现有前后端与同步 provider 实现
> Review 范围：`WritePage`、`AskHerPage`、内容生成、图片生成、TTS、selfie

---

## 1. 结论摘要

当前项目已经有一层“前端任务壳”，但还没有形成真正的统一异步任务系统。

更准确地说，当前状态是：

- 前端 `WritePage` 已尝试引入 task store / runner
- 后端仍然只有同步 API，没有真实的任务生命周期
- `AskHerPage`、内容生成链路、media 链路没有统一到同一个任务边界
- retry、dedupe、恢复、并发控制目前都只完成了局部形态，尚未闭环

因此，当前最合适的方向不是继续补前端状态管理，也不是一步上 Redis/BullMQ，而是：

**在现有 Node backend 内增加一个 SQLite 持久化任务内核 + 单进程 worker，把所有生成入口统一成“提交任务 -> 查询状态 -> 重试/恢复”的模型。**

这是本次 review 的核心建议。

---

## 2. 当前实现盘点

### 2.1 已有基础

- `WritePage` 已接入前端任务层，入口在 [src/pages/WritePage.tsx](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/WritePage.tsx:18)
- 前端已有 `taskStore`、`taskRunner`、`taskDedupe`、`mediaTaskAdapter`
- `buildJournalMedia()` 已把图片和语音封装为一个 media 编排步骤，定义在 [src/services/minimax.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/minimax.ts:190)
- 后端已经把内容、图片、TTS 收敛为服务端 API
  - [backend/src/index.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/backend/src/index.ts:159)
  - [backend/src/index.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/backend/src/index.ts:195)
  - [backend/src/index.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/backend/src/index.ts:328)

### 2.2 当前实际形态

从代码看，现系统更像是：

1. 内容生成：前端同步请求 `/api/content-generation`
2. 媒体生成：前端同步请求 `/api/image-generation`、`/api/tts`
3. `WritePage`：用本地任务状态包裹同步调用
4. `AskHerPage`：仍直接同步走 `generateJournalDraft()` + `buildJournalMedia()`

也就是说，**“任务”目前只是 UI 层的局部抽象，不是系统级抽象。**

---

## 3. 关键问题 Review

## 3.1 任务模型只存在于前端，后端没有真实任务内核

`WritePage` 使用 `runTask()`，但 `runTask()` 实际仍在浏览器里直接执行 `executeFn`，并把状态写入 `localStorage`。

对应代码：

- [src/pages/WritePage.tsx](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/WritePage.tsx:127)
- [src/services/generation/taskRunner.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/taskRunner.ts:49)
- [src/services/generation/taskStore.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/taskStore.ts:3)

这会带来几个后果：

- 页面刷新后只能恢复本地状态，无法恢复服务端真实执行进度
- 浏览器关闭后任务实际中断
- 后端重启、前端重试、多页面打开之间没有统一状态源
- 无法支持真正的后台执行

结论：

**任务的 source of truth 必须迁到服务端持久化存储，前端只能缓存和展示。**

## 3.2 retry 只有状态切换，没有真正重试调度闭环

`runTask()` 在可重试错误场景下会把任务重新标记为 `pending`，但不会再次调度执行。

对应代码：

- [src/services/generation/taskRunner.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/taskRunner.ts:88)

这意味着当前 retry 语义是“不失败地失败一次”：

- 状态变回 `pending`
- 但没有新的 worker 会拿起它
- 用户刷新后看到的是一个悬而未决的任务

结论：

**重试必须由服务端队列循环或恢复扫描器接管，不能只停留在状态字段。**

## 3.3 `pollTaskStatus()` 轮询的是本地存储，不是后端任务状态

`pollTaskStatus()` 只是反复读取 `taskStore.getTask(taskId)`。

对应代码：

- [src/services/generation/taskRunner.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/taskRunner.ts:108)

这在前端单页内可以“看起来像轮询”，但它没有以下能力：

- 无法观察服务端是否还在跑
- 无法跨页面同步
- 无法跨设备同步
- 无法处理 API server 重启后的任务恢复

结论：

**前端轮询应改为查询 `/api/generation/tasks/:id`，而非查询 `localStorage`。**

## 3.4 入口不统一，`WritePage` 和 `AskHerPage` 行为分裂

`WritePage` 使用任务层，但 `AskHerPage` 依然同步执行生成流程。

对应代码：

- [src/pages/WritePage.tsx](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/WritePage.tsx:127)
- [src/pages/AskHerPage.tsx](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/AskHerPage.tsx:26)
- [src/pages/AskHerPage.tsx](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/AskHerPage.tsx:48)

这会导致：

- 两个页面的失败语义不同
- 两个页面的恢复能力不同
- 两个页面的 dedupe / retry / 状态展示策略不同
- 后续维护时会持续分叉

结论：

**所有生成入口都应先统一到同一套 task client，再考虑页面级差异。**

## 3.5 内容生成链路没有进入统一任务体系

`generateJournalDraft()` 仍直接同步调用 `generateJournalContent()`，而 `contentClient` 在失败时直接退回本地模板。

对应代码：

- [src/services/journalGeneration.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/journalGeneration.ts:27)
- [src/services/api/contentClient.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/api/contentClient.ts:97)

这个 fallback 虽然对体验友好，但也模糊了系统语义：

- 用户无法区分“任务成功”还是“远端失败后退回本地模板”
- 后台没有记录 content generation 的真实失败率
- 后续无法对内容生成做统一重试、排队、监控

结论：

**content generation 也应任务化；本地模板 fallback 应从“隐式成功”改成“明确降级策略”。**

## 3.6 dedupe 实现与 `MediaTaskInput` 结构不匹配

`taskDedupe.ts` 中 `media` task 的 key 读取 `input.mood`、`input.date`，但 `MediaTaskInput` 的字段实际上在 `input.journal.mood`、`input.journal.date` 下。

对应代码：

- [src/services/generation/taskDedupe.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/taskDedupe.ts:19)
- [src/services/generation/types.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/types.ts:24)

这说明当前 dedupe 逻辑并不可靠，可能出现：

- 同一任务未被识别为重复
- 不完整 key 导致误判

结论：

**dedupe key 应作为服务端 canonical key 统一生成，不应由各页面各自拼装。**

## 3.7 并发控制只存在于函数内部，不存在系统级总闸门

目前 `synthesizeVoiceMessages()` 内部只做了局部 `concurrencyLimit = 2`。

对应代码：

- [src/services/minimax.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/minimax.ts:130)

`buildJournalMedia()` 也会直接并发发起 image + TTS：

- [src/services/minimax.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/minimax.ts:203)

问题在于这只是“单次调用内的局部限流”，无法防止：

- 用户多次点击
- 多页面并发
- 不同入口同时触发
- 恢复时瞬间重放一批 pending task

结论：

**需要服务端级别的 per-task-type 并发上限，而不是只在某个 helper 里限一次。**

## 3.8 状态模型过于粗糙，无法表达恢复、取消、部分成功

当前任务状态只有：

- `pending`
- `running`
- `success`
- `failed`

对应定义：

- [src/services/generation/types.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/types.ts:5)

但当前业务实际上已经存在更多状态语义：

- 部分成功：图片失败但语音成功，或反之
- 降级成功：远端失败后走 fallback
- 任务陈旧：页面刷新 / 进程重启后，不知道原 `running` 是否还在执行
- 可取消：用户离开页面后不希望继续消耗资源

结论：

**应把“任务状态”和“任务结果质量”拆开。状态机负责生命周期，result summary 负责表达 partial/degraded。**

---

## 4. 推荐的统一结构

## 4.1 统一原则

在当前项目下，最稳妥的统一方式是：

- 前端不再直接“执行生成”，只负责“提交任务”和“观察任务”
- 后端负责：
  - 持久化
  - 排队
  - lease / 恢复
  - 重试
  - 并发控制
  - 最终结果落库
- 现有同步 provider 调用继续保留，但下沉为 runner 内部实现

这意味着：

- `/api/content-generation`、`/api/image-generation`、`/api/tts` 不必马上删除
- 但页面层不应再直接依赖它们
- 页面统一改为走 `/api/generation/tasks`

## 4.2 推荐任务边界

不建议把 image / tts / content 都拆成用户可见的独立任务。对当前产品来说，更合理的是以下 3 类任务：

- `draft_generation`
  - 输入：`mood/date/recalledMemory/voiceStyle/sceneHint`
  - 输出：`journalContent/voiceScripts/source`
- `media_generation`
  - 输入：`journal/referenceImage/generateSelfies/voiceStyle`
  - 输出：`images/voiceMessages/selfies`
- `selfie_generation`
  - 输入：`mood/referenceImage/content/date`
  - 输出：`selfie(s)`

如果后续想进一步统一 UI，可以再增加一种复合任务：

- `journal_entry_generation`
  - 先跑 `draft_generation`
  - 再跑 `media_generation`

但不建议第一阶段就做复合任务。先把 3 个基础任务跑稳更重要。

## 4.3 推荐状态模型

建议扩展为：

```ts
type TaskStatus =
  | "queued"
  | "leased"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "stale";
```

另加结果维度：

```ts
type TaskOutcome = "full_success" | "partial_success" | "degraded_success";
```

说明：

- `queued`：待执行
- `leased`：已被 worker 抢占，防止重复执行
- `running`：正式执行中，可带 progress
- `succeeded`：任务完成
- `failed`：已耗尽重试
- `cancelled`：用户取消
- `stale`：worker 异常退出或 lease 过期，需要恢复扫描

而 `partial_success` / `degraded_success` 不作为主状态，而作为 `resultSummary`。

---

## 5. 推荐的后端实现方式

## 5.1 SQLite 持久化任务表

在不新增基础设施的前提下，推荐使用 SQLite 作为任务主存储。

建议表结构字段至少包括：

```sql
CREATE TABLE generation_tasks (
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
```

建议增加索引：

```sql
CREATE INDEX idx_generation_tasks_status_available
ON generation_tasks(status, available_at, priority, created_at);

CREATE INDEX idx_generation_tasks_dedupe
ON generation_tasks(dedupe_key, status);
```

## 5.2 单进程 worker + 恢复扫描器

第一阶段不需要独立 worker 进程，可以先在 backend 进程内启动两个后台循环：

1. `dispatcher`
从 SQLite 中挑选可执行任务，写入 lease，然后执行 runner

2. `recoveryScanner`
定期扫描 lease 过期的 `leased/running` 任务，标记为 `stale` 或重新入队

这样已经可以解决：

- 进程重启后的悬挂任务
- `pending/running` 永久卡死
- retry 不闭环

## 5.3 系统级并发闸门

建议在后端定义固定并发上限，而不是只靠函数内 `Promise.allSettled()`。

例如：

```ts
const TASK_CONCURRENCY = {
  draft_generation: 2,
  media_generation: 1,
  selfie_generation: 1,
};
```

并细分 runner 内部调用顺序：

- `draft_generation`：内容生成一次只跑一个 provider 调用
- `media_generation`：image 和 TTS 可以内部并行，但整个 media task 外层并发要受控
- `selfie_generation`：单独限流，避免图片类请求挤爆

关键点：

**局部并行可以保留，但必须被外层任务级并发限制包住。**

---

## 6. 推荐的前端结构

## 6.1 前端从“执行器”改为“任务客户端”

当前前端 `taskRunner` 更像本地执行器，建议改造成 `generationTaskClient`：

- `createTask()`
- `getTask()`
- `listTasks()`
- `retryTask()`
- `cancelTask()`

前端本地 `taskStore` 仍可保留，但角色改为：

- UI cache
- 断网时的最近状态回显
- 页面恢复时的任务列表入口

不再作为任务真相源。

## 6.2 页面统一接入方式

建议两条页面都走同样的模式：

### `WritePage`

1. 创建 `draft_generation` 任务
2. 得到内容草稿后允许编辑
3. 用户保存时创建 `media_generation` 任务
4. UI 轮询服务端任务状态

### `AskHerPage`

1. 点击“请她写”时创建 `draft_generation` 任务
2. 点击“保存日记”时创建 `media_generation` 任务
3. 若需要单独补自拍，则创建 `selfie_generation` 任务

这样两个页面的差异只剩 UI，不再是底层生成架构差异。

## 6.3 fallback 策略改造

当前 content generation 的 fallback 是隐式的。建议改为显式：

- 服务端远端失败但允许降级时：
  - `status = succeeded`
  - `outcome = degraded_success`
  - `resultSummary.fallbackUsed = true`
- UI 明确显示：
  - “已使用本地兜底文案”

这样既保留体验，也不丢失监控语义。

---

## 7. API 建议

建议统一为：

```http
POST /api/generation/tasks
GET /api/generation/tasks/:id
GET /api/generation/tasks?status=queued&type=media_generation
POST /api/generation/tasks/:id/retry
POST /api/generation/tasks/:id/cancel
```

`POST /api/generation/tasks` 请求体建议：

```json
{
  "type": "media_generation",
  "input": {},
  "priority": 5,
  "dedupePolicy": "reuse_active"
}
```

响应建议：

```json
{
  "task": {
    "id": "tsk_xxx",
    "status": "queued",
    "type": "media_generation",
    "dedupeKey": "media:2026-05-17:开心:soft",
    "retryCount": 0,
    "maxRetries": 3
  },
  "deduped": false
}
```

如果命中去重，返回：

```json
{
  "task": { "...": "existing task" },
  "deduped": true
}
```

---

## 8. 去重、重试、恢复策略建议

## 8.1 去重

去重应在服务端完成，且 key 由任务类型统一定义。

建议：

- `draft_generation`
  - `draft:{date}:{mood}:{voiceStyle}:{sceneHintHash}:{memoryHash}`
- `media_generation`
  - `media:{journalId}:{contentHash}:{voiceStyle}:{hasReferenceImage}`
- `selfie_generation`
  - `selfie:{date}:{mood}:{referenceImageHash}:{contentHash}`

规则：

- 仅复用 `queued/leased/running` 的任务
- `failed/cancelled/stale` 不自动复用
- `succeeded` 是否复用由业务决定，建议默认允许读取结果但不阻止重新生成

## 8.2 重试

建议把重试分两类：

- 自动重试
  - 网络错误
  - 超时
  - provider 5xx
  - 明确可恢复错误
- 手动重试
  - 用户点击 retry
  - 系统把任务复制为新的 attempt，保留 parent task id 或 lineage

退避策略建议：

- 第 1 次：15 秒
- 第 2 次：60 秒
- 第 3 次：5 分钟

实现方式：

- 不要立即再次执行
- 通过更新 `available_at` 重新入队

## 8.3 恢复

建议增加启动恢复规则：

- 服务启动时扫描：
  - `leased/running` 且 `lease_expires_at < now`
- 标记为：
  - `stale`
  - 或自动转回 `queued`

建议第一版保守处理：

- 先标 `stale`
- UI 给出“可重试”

这样更安全，避免上游 provider 已实际完成但本地状态未知时发生重复扣费。

---

## 9. 结合当前代码的具体改造建议

## 9.1 前端

优先改造以下文件：

- [src/pages/WritePage.tsx](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/WritePage.tsx:127)
  - 去掉“本地执行任务”的职责
  - 改为 submit + poll server
- [src/pages/AskHerPage.tsx](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/AskHerPage.tsx:26)
  - 接入同一 task client
- [src/services/generation/taskRunner.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/taskRunner.ts:49)
  - 改名或重构为 API client，不再负责本地执行
- [src/services/generation/taskDedupe.ts](/c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/generation/taskDedupe.ts:10)
  - 前端只保留轻量 optimistic dedupe，真正逻辑下沉服务端

## 9.2 后端

建议新增目录：

```text
backend/src/generation/
  types.ts
  taskRepository.ts
  taskScheduler.ts
  taskRecovery.ts
  taskService.ts
  runners/
    draftRunner.ts
    mediaRunner.ts
    selfieRunner.ts
  routes/
    generationRoutes.ts
```

其中：

- `draftRunner.ts` 复用当前 `/api/content-generation` 的 provider 调用逻辑
- `mediaRunner.ts` 复用当前 `buildJournalMedia()` 语义，但迁到后端执行
- `selfieRunner.ts` 复用现有 selfie 逻辑

## 9.3 兼容策略

建议分阶段兼容：

### Phase 1

- 保留旧同步端点
- 新页面逻辑优先走 `/api/generation/tasks`

### Phase 2

- 旧同步端点只供内部 runner 调用或测试使用
- 页面层全面切换

### Phase 3

- 视情况决定是否收缩或下线旧同步直接入口

---

## 10. 推荐落地阶段

## Phase A：统一任务协议

目标：

- 定义统一 task schema
- 服务端 SQLite repository
- `/api/generation/tasks` 创建与查询

验收：

- 可以提交 `draft_generation` 任务
- 可以刷新后继续查询任务结果

## Phase B：接入内容生成

目标：

- `generateJournalDraft()` 改走任务 API
- `AskHerPage.handleGenerate()` 接入任务化内容生成

验收：

- 内容生成失败、fallback、retry 有明确状态

## Phase C：接入 media 生成

目标：

- `WritePage` 和 `AskHerPage` 的 media 保存统一走 `media_generation`
- 后端加全局并发上限

验收：

- 多次点击不会造成并发风暴
- 页面刷新后还能看到进度和结果

## Phase D：恢复与重试闭环

目标：

- lease 机制
- stale 扫描
- retry backoff

验收：

- backend 重启后，running 任务不会永久卡死

## Phase E：取消与可观测性

目标：

- cancel API
- 结构化日志
- 基础统计

验收：

- 能看到各类任务成功率、失败率、fallback 使用率

---

## 11. 明确不建议的方向

以下方向不建议作为当前阶段主方案：

- 继续扩展纯前端 `localStorage` 任务系统
  - 无法解决真正的后台执行和刷新恢复
- 让每个页面自己维护一套生成状态机
  - 会持续分叉
- 把 image / tts / content 直接拆成过细的用户可见任务
  - UI 复杂度和恢复复杂度会显著上升
- 一开始就引入 Redis/BullMQ
  - 当前约束下过重，且不是最短闭环

---

## 12. 最终建议

如果只保留一句建议，那就是：

**把“任务”从前端 UI 概念升级成后端持久化概念，用 SQLite + 单进程 worker 先把生命周期跑通，再让 `WritePage` 和 `AskHerPage` 全部改为“提交任务而不是直接生成”。**

这是在当前项目约束下，成本最低、收益最大、也最容易渐进落地的路径。

---

## 13. 后续实现优先级

建议实现顺序：

1. 服务端 SQLite 任务表 + 查询接口
2. `draft_generation` 任务化
3. `media_generation` 任务化
4. `AskHerPage` / `WritePage` 统一接入
5. retry / stale recovery
6. cancel / metrics

如果你准备继续，我下一步建议直接把这份 review 拆成一份 implementation plan，并且按你当前代码结构列出最小改动文件清单。
