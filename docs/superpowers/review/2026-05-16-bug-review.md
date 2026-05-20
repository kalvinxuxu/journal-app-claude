# 代码审查报告：三个潜在 Bug 分析

> 日期：2026-05-16
> 项目：女友手账 Journal App

---

## 问题一：日记长期记忆无法存储

### 相关代码位置

| 文件 | 行号 | 函数/逻辑 |
|------|------|----------|
| `src/services/generator.ts` | 1-14 | 单例 `sharedMemoryEngine` 内存存储 |
| `src/services/generator/memoryEngine.ts` | 25-59 | `createMemoryEngine()` 内存 in-memory |
| `src/services/memory.ts` | 52-55 | `saveJournals()` 仅保存日记内容，不保存记忆 |

### 根因分析

**MemoryEngine 是纯内存存储**：
```ts
// memoryEngine.ts:26
let memories: MemoryEntry[] = [];  // 内存变量，刷新丢失
```

`addJournalToMemory()` 只是往内存数组 `memories` 里 `unshift()`，但：
1. 页面刷新后 `memories` 重置为空数组
2. `saveJournals()` 保存的是日记 `Journal[]`，**不包含** `MemoryEntry[]`
3. 没有 `loadMemory()` / `saveMemory()` 对应函数

**记忆召回在 generator/index.ts 中**：
```ts
const memoryEngine = createMemoryEngine();  // 每次创建都是新的空引擎
```
每次 App 启动或模块重新加载，记忆都会丢失。

### 潜在 Bug
- 页面刷新后 `memoryEngine.memories` 被重置
- `saveJournals()` 保存日记时没有同时保存记忆上下文
- 没有持久化 `MemoryEntry[]` 到 localStorage

---

## 问题二：生成照片无法稳定生成

### 相关代码位置

| 文件 | 行号 | 函数/逻辑 |
|------|------|----------|
| `src/services/api/mediaClient.ts` | 35-74 | `generateImages()` HTTP 调用 |
| `src/services/api/mediaClient.ts` | 262-346 | `generateSelfies()` 自拍生成 |
| `src/services/minimax.ts` | 75-95 | `generateMinimaxImages()` |
| `backend/src/index.ts` | - | `/api/image-generation` 后端端点 |
| `.planning/debug/selfie-partial-success-and-url-expiration.md` | - | 历史调试记录 |

### 根因分析

**可能原因 1：URL 过期** `mediaClient.ts:202-226`
```ts
// fetchImageAsBase64 将 URL 转为 base64，但没有处理已失效的 URL
const result = await fetchImageAsBase64(url);
if (result.dataUrl) {
  window.localStorage.setItem(referenceImageKey, result.dataUrl);
}
```

**可能原因 2：生成失败时无重试机制** `mediaClient.ts:304-313`
```ts
try {
  response = await fetch(url, { ... });
} catch (err) {
  return { selfies: [], error: `自拍生成请求失败：${err.message}` };
}
// 没有重试逻辑，直接返回错误
```

**可能原因 3：并发请求导致 504** 历史调试记录显示 `504 (Outdated Request)`，说明 Vite HMR 环境下请求容易过时

### 潜在 Bug
- `generateImages` / `generateSelfies` 失败后前端没有重试
- 生成的 URL 是临时的 signed URL，过期后无法访问
- `validateImageUrl` 只做 HEAD 检查，无法真正保证可访问性

---

## 问题三：语音经常无法生成

### 相关代码位置

| 文件 | 行号 | 函数/逻辑 |
|------|------|----------|
| `src/services/api/mediaClient.ts` | 125-187 | `synthesizeSpeech()` |
| `src/services/minimax.ts` | 118-161 | `synthesizeVoiceMessages()` 并行合成 |
| `backend/src/index.ts` | - | `/api/tts` 后端端点 |

### 根因分析

**可能原因 1：空值处理** `mediaClient.ts:169-172`
```ts
const hex = json.data?.audio;
if (!hex) {
  return { audioDataUrl: null, error: "语音合成返回空数据" };
}
// 直接返回 null，但没有区分是 API 错误还是真正的空数据
```

**可能原因 2：并行请求部分失败** `minimax.ts:144-155`
```ts
results.forEach((result, index) => {
  if (result.status === "fulfilled") {
    enriched.push(result.value);
    return;
  }
  // 失败时保留原 voiceMessages[index]，但没有错误提示给用户
  enriched.push(voiceMessages[index]);
  errors.push(`语音生成失败：${result.reason}`);
});
```

**可能原因 3：API 响应格式不一致** backend 返回 `json.data?.audio` 可能为空字符串 `""` 而非 `undefined`

### 潜在 Bug
- TTS API 调用失败时，`enriched` 数组保留了原数据但错误信息丢失
- `synthesizeVoiceMessages` 返回的 `errors` 数组未被调用方检查
- 无超时机制，长时间等待后返回错误

---

## 建议优先级

| 优先级 | 问题 | 修复建议 |
|--------|------|----------|
| 🔴 高 | 记忆无法持久化 | 实现 `saveMemory()` / `loadMemory()` |
| 🟡 中 | 照片生成不稳定 | 添加重试机制 + base64 持久化 |
| 🟡 中 | 语音生成失败 | 改进错误处理 + 添加超时 |

---

## 附录：关键文件索引

**记忆相关**：
- `src/services/generator.ts` - 单例 memoryEngine
- `src/services/generator/memoryEngine.ts` - MemoryEngine 实现

**图像生成相关**：
- `src/services/api/mediaClient.ts` - HTTP 客户端
- `src/services/minimax.ts` - 业务层编排

**语音合成相关**：
- `src/services/api/mediaClient.ts:125-187` - synthesizeSpeech
- `src/services/minimax.ts:118-161` - synthesizeVoiceMessages

**存储相关**：
- `src/services/memory.ts` - localStorage 读写工具