# Review Bug 核实报告及实施计划

**日期：** 2026/05/16
**来源：** `c:\Users\kalvi\Downloads\journal_app_backend_and_tts_review_20260516.md`
**核实方法：** systematic-debugging（系统调试四阶段法）

---

## 一、Bug 核实结果总览

| Bug | Review 描述 | Review 判断 | 实际核实 | 状态 |
|-----|-------------|-------------|----------|------|
| 1 | 图片叠加 | 已修复 | ✅ 已正确修复 | ✅ 完成 |
| 2 | localStorage 端口变化 | 需修改 vite.config.js | ⚠️ 部分修复 | ⚠️ 待完成 |
| 3 | 后端服务不存在 | ERR_CONNECTION_REFUSED | ❌ **误判** - 后端实际运行中 | 🔴 新发现 |
| 4 | API 地址写死 | 建议环境变量化 | ⚠️ 部分问题 | ⚠️ 待完成 |
| 5 | health 检查路径 | /api/health | ⚠️ 路径不匹配 | 🔴 待修复 |
| 6 | TTS 限流 | 建议不要 Promise.all | ✅ 已有实现 | ✅ 已确认 |
| 7 | 图片 retry | 建议 retry | ✅ 已有实现 | ✅ 已确认 |
| 8 | TTS API 参数缺失 | Review 未提及 | ❌ 新发现 bug | 🔴 待修复 |

---

## 二、已确认完成的 Bug

### Bug #1: 图片叠加问题 ✅

**Review 说：** 根因正确，已添加 object-fit: cover

**核实结果：**
- `global.css` 第 140 行已正确添加 `.image-tile img { object-fit: cover }`
- 实际测量：修复前 width=1280px，修复后 width=434px（正常）

**Review 建议的进一步优化（未实施）：**
```css
.image-tile {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
}
.image-tile img {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: inherit;
}
```

---

### Bug #6: TTS 限流 ✅

**Review 说：** 不要 Promise.all，建议限流

**核实结果：**
`services/minimax.ts` 第 129-137 行已有正确的 chunk 并发控制：
```typescript
const concurrencyLimit = 2;
for (const chunk of chunks) {
  const chunkResults = await Promise.allSettled(...);
}
```

---

### Bug #7: 图片 Retry ✅

**Review 说：** 建议 retry 机制

**核实结果：**
`services/api/mediaClient.ts` 第 20-62 行已有完整的 `fetchWithRetry` 实现，包含：
- 重试次数（默认 3）
- 指数退避（baseDelayMs=1000ms）
- 超时控制（30s）
- 状态码判断（429, 500-504 重试，401/403/400 不重试）

---

## 三、待实施的 Bug 修复

### Bug #2: localStorage 端口问题 ⚠️

**问题：** `package.json` 的 dev 脚本仍使用有问题的 `portable-vite.mjs`

**当前状态：**
- `vite.config.js` 已固定端口 5173 ✅
- `package.json` dev 脚本仍用 `node ./scripts/portable-vite.mjs dev` ❌

**修复方案：**
```json
// package.json
"dev": "vite"
```

**验证方式：**
```bash
npm run dev
# 应直接启动在 5173 端口，不经过 portable-vite.mjs
```

---

### Bug #3 & #5: 后端 health 检查路径不匹配 🔴

**问题：**
- 后端实际路径：`/health`
- 前端期望路径：`/api/health`
- Review 误判后端不存在，实际后端运行正常

**核实证据：**
```bash
$ curl http://localhost:3001/health
→ {"status":"ok","timestamp":"..."}

$ curl -X POST http://localhost:3001/api/content-generation
→ {"journalContent":"...","voiceScripts":[...]}
```

**修复方案（方案 A - 推荐）：**

1. **后端** `backend/src/index.ts`：
```typescript
// 将 /health 改为 /api/health
app.get("/api/health", (_, res) => {
  res.json({ ok: true, service: "journal-app-backend" });
});
```

2. **前端** `src/services/api/mediaClient.ts` 和 `contentClient.ts`：
```typescript
const healthUrl = `${getBackendUrl()}/api/health`;
```

**验证方式：**
```bash
# 后端
curl http://localhost:3001/api/health
→ {"ok":true,"service":"journal-app-backend"}

# 前端控制台应无 ERR_CONNECTION_REFUSED
```

---

### Bug #4: mediaClient.ts API 地址硬编码 🔴

**问题：** `mediaClient.ts` 第 8 行：
```typescript
const DEFAULT_BACKEND_URL = "http://localhost:3001";
```

**对比：** `contentClient.ts` 已正确使用：
```typescript
function getBackendUrl() {
  const env = (import.meta.env as Record<string, string | undefined>);
  return env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL;
}
```

**修复方案：**

1. 修改 `mediaClient.ts`：
```typescript
const DEFAULT_BACKEND_URL = "http://localhost:3001";

function getBackendUrl() {
  const env = (import.meta.env as Record<string, string | undefined>);
  return env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL;
}
```

2. 更新 `.env.local`：
```env
VITE_BACKEND_URL=http://localhost:3001
```

3. 更新 `vite.config.js` 以正确传递 env：
```javascript
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  define: {
    "import.meta.env": {},
  },
});
```

---

### Bug #8: TTS API 参数缺失 🔴

**问题：** 调用 `/api/tts` 时缺少必需参数 `model`

**核实证据：**
```bash
$ curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"测试语音","mood":"开心","voiceStyle":"soft"}'
→ {"base_resp":{"status_code":2013,"status_msg":"invalid params, binding: expr_path=model, cause=missing required parameter"}}
```

**根因分析：**
`mediaClient.ts` 中 `synthesizeSpeech` 函数调用的参数可能不包含 `model`，而 MiniMax TTS API 要求必须传递 `model` 参数。

**修复方案：**

1. 检查 `mediaClient.ts` 的 `synthesizeSpeech` 函数调用
2. 确保传递 `model: "speech-01-tba"` 或后端配置的默认 model
3. 后端 `index.ts` 第 335 行代理时应设置默认 model

**后端修复** `backend/src/index.ts`：
```typescript
// TTS 端点
app.post("/api/tts", async (req: Request, res: Response) => {
  try {
    const { text, stream, language_boost, output_format, voice_setting, audio_setting, pronunciation_dict, subtitle_enable } = req.body;

    // 默认 model
    const model = "speech-01-tba";

    const result = await proxyToMiniMax<{...}>("/t2a_v2", {
      model,
      text,
      // ... 其他参数
    });
  }
});
```

---

## 四、实施优先级与计划

### P0（必须立即修）

| 优先级 | Bug | 实施步骤 |
|--------|-----|----------|
| P0-1 | Bug #2 | 修改 `package.json` dev 脚本 |
| P0-2 | Bug #3/#5 | 统一 health 检查路径为 `/api/health` |
| P0-3 | Bug #4 | 统一 API URL 环境变量化 |
| P0-4 | Bug #8 | 修复 TTS model 参数 |

### P1（下一阶段）

| 优先级 | Bug | 说明 |
|--------|-----|------|
| P1-1 | Bug #1 优化 | 添加 aspect-ratio 和 border-radius 优化 |

### P2（长期优化）

- 建立统一的 GenerationTask 任务系统（Review 建议）
- 增强错误提示 UI

---

## 五、验证检查清单

修复后必须验证：

- [ ] `npm run dev` 启动在 5173 端口
- [ ] `curl http://localhost:3001/api/health` 返回 200
- [ ] 前端控制台无 ERR_CONNECTION_REFUSED
- [ ] 图片生成正常显示（无叠加）
- [ ] TTS 生成成功，无 missing parameter 错误
- [ ] localStorage 数据跨刷新保持

---

## 六、相关文件清单

| 文件 | 涉及 Bug | 当前状态 |
|------|----------|----------|
| `package.json` | #2 | 需修改 dev 脚本 |
| `vite.config.js` | #2 | 已固定 5173 ✅ |
| `src/services/api/mediaClient.ts` | #3/#4/#8 | 需修改 health 路径、API URL、TTS model |
| `src/services/api/contentClient.ts` | #3/#4 | 已用 env，但 health 路径不匹配 |
| `backend/src/index.ts` | #3/#5/#8 | 需修改 health 路径、TTS 默认 model |
| `src/styles/global.css` | #1 优化 | 建议添加 aspect-ratio 优化 |
| `.env.local` | #4 | 需添加 VITE_BACKEND_URL |

---

**结论：** Review 中的核心建议有价值，但存在一些误判（后端不存在）。通过系统调试方法，已验证后端实际运行正常，问题在于配置路径不匹配和参数传递缺失。实施计划已细化到具体文件和代码行。