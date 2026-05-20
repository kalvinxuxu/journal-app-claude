# Review

日期：2026-05-13

范围：仅审查“图片无法正确生成”相关链路，重点看 `src/services/minimax.ts`、`src/pages/WritePage.tsx`、`src/pages/SettingsPage.tsx`、`src/App.tsx`。

## 结论

当前问题的主因不是 `.env.local` 缺 key，也不是浏览器 CORS。

更大的问题有两类：

1. 图片/TTS 直接在前端调用 MiniMax，API Key 已暴露到客户端。
2. 自拍一致性方案依赖了当前实现中的 `character_id`，但官方文档使用的是 `subject_reference`，实现和实际接口能力不匹配。

## Findings

### 1. API Key 暴露在前端

- 文件：`src/services/minimax.ts:59`
- 文件：`.env.local:1`

`VITE_MINIMAX_API_KEY` 被前端直接读取并用于浏览器 `fetch`。

这意味着：

- key 会被打进前端构建产物
- 任何打开页面的人都可以提取并滥用它
- 即使图片能生成，这也是必须尽快修复的安全问题

建议：

- 将图片生成和 TTS 改为服务端代理
- 轮换当前 `.env.local` 中已使用过的 key

### 2. 自拍一致性方案的核心字段可能不成立

- 文件：`src/services/minimax.ts:327`
- 文件：`src/services/minimax.ts:352`
- 文档：`docs/superpowers/specs/2026-05-11-girlfriend-selfie-design.md:75`

当前实现假设：

- 首次生成返回 `character_id`
- 后续请求携带 `character_id`
- 这样可以保持“同一个女友形象”

但仓库内设计文档和实现都围绕 `character_id`，而当前官方图片生成文档方案使用的是 `subject_reference`，不是这里的 `character_id`。

结果是：

- “人物一致性”这条方案很可能本身就走不通
- 即使请求成功，也未必能得到预期的一致人物效果

建议：

- 重新按官方支持的字段和工作流实现一致性方案
- 不要继续把 `character_id` 当作核心协议前提

### 3. 图片失败后被占位图掩盖

- 文件：`src/services/minimax.ts:263`
- 文件：`src/services/minimax.ts:277`
- 文件：`src/pages/WritePage.tsx:76`

`buildJournalMedia` 在图片生成失败时，会：

- 记录错误
- 回退到 `createImagePlaceholder(...)`
- 继续返回一个可保存的 `journal`

`WritePage` 随后仍然执行：

- `onSave(result.journal)`

这会导致：

- 用户看起来“保存成功”
- 实际存进去的是占位图，不是真实 AI 图片
- “图片没有正确生成”被伪装成“功能已完成”

建议：

- 至少把“生成失败但已保存草稿”的状态区分清楚
- 更理想的是：图片生成失败时不要把占位图当成功结果保存

### 4. 自拍生成错误被吞掉

- 文件：`src/services/minimax.ts:357`
- 文件：`src/services/minimax.ts:376`
- 文件：`src/pages/SettingsPage.tsx:21`
- 文件：`src/App.tsx:51`

`generateGirlfriendSelfies()` 失败时返回：

- `selfies: []`
- `error: "..."`

但调用方没有真正消费 `result.error`，只检查 `selfies.length`。

后果：

- 设置页“重新生成”失败时没有明确提示
- 首页自动生成失败时也没有显式错误反馈
- 用户只能看到“没图”，很难知道是接口失败还是逻辑没走到

建议：

- 在 `SettingsPage` 和 `App` 中显式处理 `result.error`
- 给出用户可见错误提示，而不是仅 `console.error`

### 5. 域名配置不统一，增加排查成本

- 文件：`src/services/minimax.ts:51`
- 文件：`.env.local:2`
- 文件：`src/services/minimax.test.ts:39`

当前代码里同时存在：

- `https://api.minimax.io`
- `https://api.minimaxi.com/v1`

我已验证两者当前都能通过浏览器预检，所以这不是这次故障的根因。

但它会导致：

- 调试时不容易确认“究竟哪一个是标准配置”
- 文档、测试、实现三边容易漂移

建议：

- 统一成一个官方域名配置
- 默认值、测试、文档都保持一致

## 已验证事实

1. `.env.local` 中 `VITE_MINIMAX_API_KEY` 和 `VITE_MINIMAX_BASE_URL` 都存在，不是“没配 key”。
2. `src/services/minimax.test.ts` 能通过，但这些测试只验证 mocked `fetch`，没有验证真实 API 契约。
3. 对 `image_generation` 做过浏览器预检，请求头允许 `Authorization` 和 `Content-Type`，因此不是 CORS 阻断。

## 建议修复顺序

1. 先把 MiniMax 能力迁到服务端，移除前端直连 key。
2. 重做自拍一致性方案，按官方支持的字段实现，不再依赖 `character_id`。
3. 收紧错误处理：不要把占位图伪装成成功生成结果。
4. 在设置页和首页显式展示自拍生成失败原因。
5. 统一 base URL 配置。

## 本次审查涉及文件

- `src/services/minimax.ts`
- `src/pages/WritePage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/App.tsx`
- `src/services/minimax.test.ts`
