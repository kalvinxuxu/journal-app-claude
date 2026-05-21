# Fly.io 轻量部署落地方案

> 目标：以最小改造成本，把当前项目部署到线上可用状态，并保留现有 Express 后端、SQLite 任务系统和媒体生成链路，适配“轻量使用”场景。

## 结论

对于当前仓库结构，`Fly.io` 是比 `Vercel + Railway`、`Vercel + Render` 更贴合的一条部署路径，原因是：

1. 当前项目不是纯静态前端，而是：
   - `Vite` 前端
   - `Express` 后端
   - SQLite 持久化任务系统
   - 图片 / TTS / 内容生成 API 代理

2. 当前后端强依赖本地持久化能力：
   - `backend/src/index.ts`
   - `backend/src/generation/taskRepository.ts`

3. Fly.io 原生支持：
   - 常驻 Node 服务
   - 挂载 volume 持久化 SQLite
   - 单机轻量应用

对于“自己轻量使用、低并发、先上线跑起来”的目标，Fly.io 可以减少架构拆分和代码重构。

## 当前架构判断

### 前端

- 根目录 `Vite` 应用
- 运行时通过 `VITE_BACKEND_URL` 访问后端 API

### 后端

- `backend/src/index.ts` 中有 `Express` 服务
- 对外提供：
  - `/api/health`
  - `/api/content-generation`
  - `/api/image-generation`
  - `/api/tts`
  - generation task 相关 API

### 持久化

- SQLite 任务库由 `better-sqlite3` 驱动
- 默认数据库路径：

```ts
process.env.GENERATION_TASK_DB_PATH ?? "./generation-tasks.db"
```

这意味着：
- 不能部署到纯 ephemeral 文件系统环境
- 需要持久卷或外部数据库

## 为什么优先选 Fly.io

### 优点

1. 可以继续保留 SQLite。
2. 可以继续保留现有 Express。
3. 不需要把生成任务系统改成 Postgres 才能上线。
4. 不需要拆成多个平台才能跑起来。
5. 对轻量项目，部署拓扑更简单。

### 缺点

1. SQLite 本质仍是单机写入。
2. volume 绑定单台机器，不适合多实例横向扩展。
3. 如果 volume 或宿主机故障，需要备份恢复策略。
4. 不适合作为未来高并发版本的长期最终架构。

## 部署策略

推荐采用：

## 方案 A：前后端全上 Fly.io

适合：
- 你优先想省心
- 项目自己用或少量用户用
- 不想维护两个平台

拓扑：

```text
Fly App
├── Frontend static assets / built app
└── Express backend
    └── SQLite on Fly Volume
```

特点：
- 平台统一
- CORS 和域名配置最简单
- SQLite 最容易落地

### 方案 B：前端 Vercel，后端 Fly.io

适合：
- 想保留 Vercel 的静态托管体验
- 后端继续保留 SQLite + Express

拓扑：

```text
Vercel
└── Vite frontend

Fly.io
└── Express backend
    └── SQLite on Fly Volume
```

特点：
- 前端更容易迭代
- 后端结构不用大改
- 比 `Vercel + Railway/Render` 更适合当前 SQLite 任务系统

### 本方案推荐

当前优先推荐：

**方案 A：前后端全上 Fly.io**

因为它改造最少，且最适合先验证线上可用性。

## 代码改造目标

本轮部署尽量只做部署层改动，不做业务重写。

### 必做改动

1. 明确前端构建产物由后端托管，或单独前端构建后托管。
2. 将 `GENERATION_TASK_DB_PATH` 指向 volume 挂载目录。
3. 将后端所需密钥改成 Fly secrets。
4. 确保生产环境 `CORS` 与 `VITE_BACKEND_URL` 匹配。
5. 明确 `PORT` 使用 Fly 注入的监听端口。

### 非必做改动

1. 不要求本轮把 SQLite 改成 Postgres。
2. 不要求本轮把 generation task 改成外部队列。
3. 不要求本轮拆分服务。

## 建议目录与运行方式

当前仓库结构建议保持不变：

```text
/
├── src/
├── backend/
│   ├── src/
│   └── ...
├── package.json
└── ...
```

建议在部署时采用以下思路之一：

### 方式 1：单容器托管前后端

流程：

1. 构建前端 `vite build`
2. 构建后端
3. 后端静态托管前端 `dist/`
4. 同一台 Fly Machine 同时对外服务前端与 API

适合：
- 最少维护成本
- 轻量上线

### 方式 2：前端静态单独托管，后端只跑 API

适合：
- 以后前后端分离更方便
- 当前也仍可行

但对于本项目“轻量上线”目标，优先建议方式 1。

## SQLite 与 Volume 方案

### 推荐配置

在 Fly.io 上创建一个 volume，例如挂载到：

```text
/data
```

然后设置：

```text
GENERATION_TASK_DB_PATH=/data/generation-tasks.db
```

### 原则

1. SQLite 只能有单个主写实例。
2. 只跑 1 台后端 Machine。
3. 不在本轮做自动多副本写入。

### 风险说明

- SQLite 跑在单 volume 上，仍有单点风险。
- 必须配合 snapshot / 备份策略。

## 环境变量与 Secrets

Fly.io 需要配置的核心变量：

```text
PORT=8080
MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
ZIMAGE_API_KEY=...
GENERATION_TASK_DB_PATH=/data/generation-tasks.db
```

如果采用前后端全上 Fly.io，前端环境中建议：

```text
VITE_BACKEND_URL=
```

说明：
- 若前后端同域，前端应尽量使用相对路径或构建时不写死独立后端域名
- 避免把生产前端仍指向 `localhost:3001`

如果采用 Vercel + Fly.io，则：

```text
VITE_BACKEND_URL=https://<your-fly-backend-domain>
```

## Fly.io 运行建议

### Machine 数量

生产轻量版：

- `1` 台 Machine
- `1` 个 volume

### Region

优先选离你和 MiniMax 较近的区域，例如亚洲区域。

原则：
- 降低你自己访问延迟
- 降低后端请求上游 AI API 的网络波动

### 自动休眠

如果主要是轻量、自用、低访问频率，可以考虑：
- 非活跃时自动停机或缩容

但要注意：
- 唤醒会增加首包延迟
- 对任务系统体验有轻微影响

如果你更看重“随时打开就能用”，建议保持单机常驻。

## 成本预估

由于 Fly.io 新账户主要是按资源计费，实际账单取决于：

1. Machine 规格
2. 运行时长
3. Volume 大小
4. 出网流量
5. Snapshot / 备份体积

对于你这个项目的“轻量使用”版本，可以按以下心智模型理解：

### 轻量档

- 1 台小 Machine
- 1 个 1GB 左右 volume
- 低访问量
- 低并发

通常目标应控制在：

```text
低双位数美元 / 月
```

### 为什么比 Vercel 方案更合适

不是因为它一定绝对更便宜，而是因为：

1. 你现在不用为了 Vercel serverless 约束重构
2. 你不用立刻把 SQLite 改成 Postgres
3. 你不用拆两套平台再处理 CORS、域名、回调、环境变量

所以综合“改造成本 + 运行成本”，Fly.io 对当前版本更划算。

## 上线步骤

### Phase 1: 部署准备

1. 确认前端与后端的生产启动命令。
2. 选择单容器还是前后端分离。
3. 确认后端生产端口与静态资源托管方式。
4. 增加部署所需配置文件：
   - `Dockerfile` 或 Fly 启动配置
   - `fly.toml`

### Phase 2: 数据落盘

1. 创建 Fly volume
2. 把 `GENERATION_TASK_DB_PATH` 指到 `/data/generation-tasks.db`
3. 确认任务表能自动初始化

### Phase 3: Secrets

1. 配置 `MINIMAX_API_KEY`
2. 配置 `MINIMAX_GROUP_ID`
3. 配置 `ZIMAGE_API_KEY`
4. 配置其它生产变量

### Phase 4: 首次上线验证

最低验证项：

1. `/api/health` 返回 200
2. 前端首页可打开
3. `content-generation` 可通
4. `image-generation` 可通
5. `tts` 可通
6. generation task 可创建、轮询、完成
7. SQLite 文件已写入 volume

## 验收标准

达到以下条件，视为 Fly.io 轻量部署落地完成：

1. 项目可在公网域名打开。
2. 前端页面可正常访问。
3. 后端健康检查可正常返回。
4. 日记文本、图片、TTS 至少能完成一轮真实生成。
5. generation task 在服务重启后仍可从 SQLite 恢复。
6. 数据库存储路径不再落在 ephemeral 根文件系统。
7. 线上环境变量和 secrets 不再依赖本地 `.env.local`。

## 本轮不做的事

为了保证部署成本和实施复杂度可控，本轮明确不做：

1. 不改 Postgres
2. 不做任务系统多实例调度
3. 不做多 region 多副本
4. 不做高可用改造
5. 不做对象存储迁移

## 后续演进路线

如果后续项目不再是“轻量使用”，建议逐步升级：

1. SQLite -> Postgres
2. 单机任务系统 -> 外部队列 / 独立 worker
3. 单实例 -> 多实例服务拆分
4. 图片 / 音频中间产物 -> 对象存储
5. 前后端托管策略再评估

## 最终建议

对当前项目，优先采用：

**Fly.io 单机 + volume + SQLite**

这是当前最符合以下目标的方案：

- 改造最少
- 上线最快
- 保留现有代码结构
- 足够支撑轻量使用

如果后续访问量、任务量、并发量明显增加，再启动第二阶段架构升级。
