# Vercel + Fly.io 线上部署方案

**目标：** 将当前项目拆分为 `Vercel` 承载 Web 前端、`Fly.io` 承载 Node/Express 后端的最小可用生产部署方案，并兼顾后续 Expo mobile 直连同一后端。

**适用范围：**
- Web 前端：根目录 `Vite + React`
- API 后端：`backend/` 下 `Express + TypeScript`
- 数据落盘：`better-sqlite3` + `storage/journals.json` + `storage/images/*` + `storage/audio/*`

---

## 1. 现状判断

### 前端

- 根项目是纯静态构建的 Vite 应用，适合直接部署到 Vercel。
- 当前已有 `VITE_BACKEND_URL` 接入方式：
  - `src/services/api/mediaClient.ts`
  - `src/services/api/contentClient.ts`
  - `src/services/generation/apiTaskClient.ts`
- 但仍存在未收敛的本地硬编码：
  - `src/services/memory.ts`
  - `src/services/minimax.ts`
  - 值均为 `http://localhost:3001`

### 后端

- `backend/src/index.ts` 直接 `app.listen(PORT)`，适合部署到 Fly.io 常驻容器。
- 健康检查已存在：
  - `/health`
  - `/api/health`
- 当前 CORS 为全开放：`app.use(cors())`

### 持久化

- 任务库：`GENERATION_TASK_DB_PATH ?? "./generation-tasks.db"`
- 日记 JSON：`storage/journals.json`
- 图片音频：`storage/images`、`storage/audio`
- 说明后端不能部署到无持久磁盘的平台做主服务，Fly.io 需要挂载 volume。

---

## 2. 推荐拓扑

### 生产域名

- Web：`https://journal-web.vercel.app`
- API：`https://journal-api.fly.dev`

### 职责划分

- `Vercel`
  - 托管 Web 静态资源
  - 注入 `VITE_BACKEND_URL`
  - 可选绑定自定义域名

- `Fly.io`
  - 运行 `backend/` Node 服务
  - 挂载持久卷保存 SQLite / JSON / 媒体文件
  - 暴露 HTTPS API 给 Web 和 Mobile 共用

### 为什么不用 Vercel 托管后端

- 当前后端依赖本地文件系统持久化。
- Vercel Serverless/Edge 不适合长期本地文件存储。
- `better-sqlite3` 和媒体文件目录更适合单实例容器 + volume。

---

## 3. 最小上线架构

### Vercel 侧

- Root Directory：仓库根目录
- Build Command：`npm run build`
- Output Directory：`dist`
- Node 版本：建议 `20`

### Fly.io 侧

- App Directory：`backend/`
- 运行方式：Dockerfile 或 Buildpacks，优先 Dockerfile
- 内部监听端口：`3001`
- 单机部署：`min_machines_running = 1`
- region：优先离主要用户更近的区域

### Fly Volume 规划

统一挂载到：

- `/data`

建议将以下内容都放到 `/data` 下：

- `/data/generation-tasks.db`
- `/data/storage/journals.json`
- `/data/storage/images/*`
- `/data/storage/audio/*`

这样容器重建不会丢数据。

---

## 4. 上线前必须完成的代码收敛

这是当前方案真正落地前的阻塞项。

### P0

1. 把 Web 端所有 `http://localhost:3001` 改为统一配置读取。
2. 后端增加可配置 CORS 白名单，不再使用全开放 `cors()`
3. 后端把所有持久化路径改为可配置根目录，例如：
   - `DATA_DIR=/data`
   - `GENERATION_TASK_DB_PATH=/data/generation-tasks.db`
4. 确认静态媒体返回给前端的是可访问的绝对地址或稳定相对地址策略。

### P1

1. 为后端补充生产启动说明：
   - `npm ci`
   - `npm run build`
   - `npm run start`
2. 为 Fly 加 `Dockerfile`
3. 为根前端补充 `.env.production` 示例

---

## 5. 建议环境变量

### Vercel

- `VITE_BACKEND_URL=https://journal-api.fly.dev`

### Fly.io

- `PORT=3001`
- `NODE_ENV=production`
- `DATA_DIR=/data`
- `GENERATION_TASK_DB_PATH=/data/generation-tasks.db`
- `MINIMAX_API_KEY=...`
- `MINIMAX_GROUP_ID=...`
- `MINIMAX_BASE_URL=https://api.minimaxi.com/v1`
- `DEEPSEEK_API_KEY=...`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `ZIMAGE_API_KEY=...`
- `CONTENT_PROVIDER=deepseek`
- `CORS_ORIGIN=https://journal-web.vercel.app`

如果后续有自定义域名，`CORS_ORIGIN` 应切到正式域名。

---

## 6. 推荐配置文件

### 根前端

建议新增：

- `vercel.json`

建议内容方向：

- 单页应用 history fallback 指向 `/index.html`
- 不做代理 API
- 所有 API 直接打到 `VITE_BACKEND_URL`

### 后端

建议新增：

- `backend/Dockerfile`
- `backend/fly.toml`

`fly.toml` 关键项应包含：

- `internal_port = 3001`
- `[[mounts]] source = "journal_data" destination = "/data"`
- 健康检查指向 `/health`
- 保持单实例

---

## 7. 建议发布流程

### 第一步：后端先上线 Fly.io

1. 创建 Fly 应用
2. 创建 volume
3. 配置 secrets / env
4. 首次部署后验证：
   - `GET /health`
   - `GET /api/health`
   - `POST /api/content-generation`
   - `POST /api/media/images`
   - `POST /api/media/audio`

### 第二步：再上线前端到 Vercel

1. 连接 Git 仓库
2. 设置 `VITE_BACKEND_URL`
3. 执行构建
4. 上线后验证：
   - 首页可加载
   - 健康检查提示正常
   - 文本生成正常
   - 图片/音频上传后可访问 Fly 返回的媒体 URL

### 第三步：移动端切到生产 API

1. 更新 `mobile-app` 的 `apiBaseUrl`
2. 真机验证：
   - 内容生成
   - 任务轮询
   - 图片上传
   - 音频播放

---

## 8. 风险与约束

### 单实例约束

- 现在的 SQLite + 本地文件方案，生产期建议单实例运行。
- 若扩到多实例，必须迁移到：
  - Postgres / LiteFS / Turso
  - 对象存储（S3 / R2）保存媒体

### 媒体文件增长

- 图片和音频都会持续占用 Fly volume。
- 需要后续增加：
  - 媒体清理策略
  - 容量告警
  - 备份策略

### 跨域与安全

- 当前 `cors()` 过宽，生产需最小化。
- 生产日志中不要打印敏感 token。

---

## 9. 本项目的最终建议

### 方案结论

本项目最稳妥的线上组合是：

- `Vercel`：仅托管 Web 前端静态站点
- `Fly.io`：托管 `backend/` 常驻 Node 服务
- `Fly Volume`：承载 SQLite、journals.json、图片和音频文件

### 实施顺序

1. 先收敛前端硬编码地址和后端数据目录配置
2. 再补 `backend/Dockerfile` 与 `backend/fly.toml`
3. 部署 Fly 后端
4. 配置 Vercel 前端
5. 最后切换 mobile 到同一生产 API

### 不建议现在做的事

- 不建议把后端直接放 Vercel Functions
- 不建议一开始就多实例 Fly
- 不建议继续把生产数据写在容器临时目录

---

## 10. 下一步可执行项

如果按这个方案继续推进，下一轮建议直接落三类文件：

1. `vercel.json`
2. `backend/Dockerfile`
3. `backend/fly.toml`

以及一组最小代码改动：

1. 收敛所有 `localhost:3001`
2. 增加 `DATA_DIR`
3. 增加 `CORS_ORIGIN`

完成后就可以进入真实部署阶段。
