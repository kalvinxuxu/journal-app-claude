# Vercel + Fly.io 实施清单

> 适用对象：当前 `journal-app-claude` 项目  
> 目标：保证后续每次本地迭代、线上部署、故障排查都有统一流程，降低“本地正常、线上异常”的概率。

---

## 1. 实施策略

### 推荐策略

始终按这个顺序推进：

1. 本地修改
2. 本地验证
3. 部署到 Fly.io 后端
4. 验证 Fly 健康检查和关键 API
5. 部署到 Vercel 前端
6. 做线上回归验收

### 原因

- 本地调试速度最快
- 后端问题可以先在本地排除
- Fly 主要承载运行时和第三方 API 风险
- Vercel 主要承载前端构建和环境变量风险
- 分阶段上线更容易定位故障来源

### 发布原则

- 一次只发布一类变更
- 后端变更优先发布后端
- 前端变更优先本地连线上后端验证
- 涉及第三方密钥的改动，必须做真实请求验证

---

## 2. 当前线上架构

### 前端

- 本地开发：`Vite`
- 线上托管：`Vercel`
- 关键环境变量：`VITE_BACKEND_URL`

### 后端

- 运行平台：`Fly.io`
- 入口：`backend/src/index.ts`
- 健康检查：`/health`
- 监听：`0.0.0.0:3001`

### 持久化

- `DATA_DIR=/data`
- `GENERATION_TASK_DB_PATH=/data/generation-tasks.db`
- 媒体目录：`/data/storage`

---

## 3. 发布前检查清单

### A. 本地代码检查

- [ ] 只改了目标范围内文件，没有顺手改无关代码
- [ ] 前端里没有遗留新的 `localhost:3001` 硬编码
- [ ] 后端本地 `npm run build` 通过
- [ ] 如果改了前端 API 调用，本地页面能正常打开
- [ ] 浏览器控制台没有新增阻塞级报错

### B. 后端配置检查

- [ ] `backend/fly.toml` 中 `app` 名称正确
- [ ] `backend/fly.toml` 中 `HOST=0.0.0.0`
- [ ] `backend/fly.toml` 中 `DATA_DIR=/data`
- [ ] `backend/fly.toml` 中 volume 挂载为 `/data`
- [ ] `backend/Dockerfile` 没有使用会破坏原生模块的错误安装方式

### C. Secrets 检查

- [ ] `CORS_ORIGIN` 已包含当前本地/线上前端域名
- [ ] `DEEPSEEK_API_KEY` 正确
- [ ] `DEEPSEEK_BASE_URL` 正确
- [ ] `MINIMAX_API_KEY` 正确
- [ ] `MINIMAX_GROUP_ID` 正确
- [ ] `MINIMAX_BASE_URL` 正确
- [ ] 其他第三方服务 key 已同步到 Fly secrets

---

## 4. 标准实施步骤

### 阶段 1：本地开发验证

#### 前端

在项目根目录：

```powershell
npm run dev
```

如果要连线上后端：

```powershell
$env:VITE_BACKEND_URL="https://journal-api-shy-pebble-9077.fly.dev"
npm run dev
```

#### 后端

在 `backend/` 目录：

```powershell
npm run build
```

如果要本地运行后端：

```powershell
npm run dev
```

### 阶段 2：部署 Fly.io 后端

目录必须在：

```text
C:\Users\kalvi\Documents\claude application\journal-app-claude\backend
```

执行：

```powershell
fly deploy --remote-only --wait-timeout 10m
```

### 阶段 3：验证 Fly 后端

```powershell
fly logs -a journal-api-shy-pebble-9077 --no-tail
```

浏览器或 curl 验证：

```powershell
curl https://journal-api-shy-pebble-9077.fly.dev/health
```

### 阶段 4：部署前端

Vercel 上确认：

- `VITE_BACKEND_URL` 指向 Fly 域名
- 构建成功
- 页面可打开

---

## 5. 出错检查事项

下面是最常见的更新失败原因。

### 5.1 Fly 提示 missing app name

症状：

```text
the config for your app is missing an app name
```

检查项：

- [ ] 当前目录是不是 `backend/`
- [ ] `fly.toml` 是否在当前目录
- [ ] `fly.toml` 里是否存在 `app = 'journal-api-shy-pebble-9077'`

修复方式：

```powershell
cd C:\Users\kalvi\Documents\claude application\journal-app-claude\backend
fly deploy --remote-only --wait-timeout 10m
```

### 5.2 Fly 启动后不可访问

症状：

```text
The app is not listening on the expected address
```

检查项：

- [ ] 后端是否监听 `0.0.0.0`
- [ ] `PORT` 是否与 `fly.toml` 的 `internal_port` 一致
- [ ] 容器是否启动后立刻退出

重点文件：

- `backend/src/index.ts`
- `backend/fly.toml`

### 5.3 better-sqlite3 启动失败

症状：

```text
Could not locate the bindings file
```

检查项：

- [ ] 是否重新执行了 `fly deploy`
- [ ] Dockerfile 是否安装了原生编译依赖
- [ ] `npm ci` 是否被错误地加了 `--ignore-scripts`

重点文件：

- `backend/Dockerfile`

### 5.4 浏览器报 CORS 错误

症状：

```text
No 'Access-Control-Allow-Origin' header
```

检查项：

- [ ] `CORS_ORIGIN` 是否包含当前真实前端来源
- [ ] 注意 `localhost:5173` 和 `127.0.0.1:5173` 是两个不同 origin
- [ ] 变更 secret 后是否重新部署

推荐值：

```text
http://localhost:5173,http://127.0.0.1:5173
```

### 5.5 `/health` 正常但业务接口 500

说明：

- 这通常不是部署问题
- 是第三方密钥、请求参数或上游 API 问题

检查项：

- [ ] `DEEPSEEK_API_KEY` 是否有效
- [ ] `MINIMAX_API_KEY` 是否有效
- [ ] `MINIMAX_GROUP_ID` 是否正确
- [ ] `fly logs` 中是否有明确上游错误信息

### 5.6 本地前端显示“后端服务未启动”

说明：

- 很多时候不是后端真的挂了
- 可能只是前端无法跨域访问或健康检查失败

检查项：

- [ ] `VITE_BACKEND_URL` 是否正确
- [ ] 浏览器控制台是否是 CORS 错误
- [ ] `https://.../health` 是否可直接访问

---

## 6. 验收标准

### A. Fly 后端验收

必须全部满足：

- [ ] `GET /health` 返回 200
- [ ] `GET /api/health` 返回 200
- [ ] Fly logs 中没有持续重启
- [ ] Fly logs 中没有 `better-sqlite3` bindings 错误
- [ ] Fly machine 状态为 healthy

### B. 前端联调验收

必须全部满足：

- [ ] 页面可以正常打开
- [ ] 不再出现 CORS 报错
- [ ] 不再提示“后端服务未启动”
- [ ] 日记读取成功
- [ ] 日记保存成功

### C. AI 能力验收

至少抽样验证以下能力：

- [ ] 日记生成功能正常
- [ ] TTS 语音生成功能正常
- [ ] 图片生成功能正常
- [ ] generation task 轮询正常

### D. 回归验收

- [ ] 首页正常
- [ ] 写日记页正常
- [ ] 语音页正常
- [ ] 设置页正常
- [ ] 控制台没有新增阻塞级错误

---

## 7. 上线后故障分流策略

### 如果是页面打不开

先查：

1. Vercel 构建是否成功
2. 前端环境变量是否正确
3. 浏览器网络请求是否正确发往 Fly

### 如果是后端接口 500

先查：

1. `fly logs`
2. 第三方 API key
3. 请求参数

### 如果是健康检查失败

先查：

1. 监听地址
2. 容器是否崩溃
3. Fly machine 是否连续重启

### 如果是功能偶发失败

先查：

1. Fly logs 是否有上游超时
2. 第三方服务是否限流
3. volume 是否正常挂载

---

## 8. 回滚策略

### 原则

- 先恢复服务可用性
- 再调查根因

### 回滚方式

#### 后端配置型问题

- 回滚 secret 到上一个可用值
- 重新 `fly deploy`

#### 后端代码型问题

- 回退到上一个稳定版本代码
- 重新部署 Fly

#### 前端问题

- 回退 Vercel 到上一个稳定部署
- 保持 Fly 不动，减少变量

---

## 9. 每次迭代的最小执行模板

### 后端改动模板

```text
1. 本地改代码
2. backend npm run build
3. 本地 smoke test
4. fly deploy
5. 检查 /health
6. 检查 fly logs
7. 检查关键 API
```

### 前端改动模板

```text
1. 本地改代码
2. npm run dev
3. 连 Fly 后端验证
4. 看浏览器控制台
5. 验证关键页面
6. 再发 Vercel
```

### 联动改动模板

```text
1. 先改后端并部署 Fly
2. 验证 API 正常
3. 再改前端并本地验证
4. 最后发 Vercel
```

---

## 10. 当前项目建议

对这个项目，后续默认采用下面的工作方式：

- 开发时优先本地运行前端
- 后端可以本地跑，也可以直接连 Fly 做真实联调
- 涉及第三方 AI 能力时，至少做一次真实线上验证
- 发布时坚持“先 Fly、后 Vercel”的顺序

如果后续要降低线上事故概率，下一步最值得补的是：

1. 前端硬编码地址全面收敛
2. 关键 API 的 smoke test 清单
3. 重复 key 等前端控制台警告清理
4. 一份稳定的 secrets 对照表
