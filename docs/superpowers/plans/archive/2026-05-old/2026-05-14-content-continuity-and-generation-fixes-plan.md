# Content Continuity And Generation Fixes Plan

**Date:** 2026-05-14  
**Scope:** 连续性问题、自动内容生成链路、人物一致性、失败可见性  
**Status:** Draft

---

## 1. 背景

当前原型已经具备基础页面和交互，但在产品可用性上仍有几个明显断点：

- 用户会感觉“昨天生成过的内容今天没了”
- 首页自动生成的“今日女友日记”只有自拍，没有真实正文和语音积累
- 人物形象存在“像同一个人，但不够稳定”的问题
- 生成失败经常被降级或弱提示掩盖

这份文档只覆盖上述问题，不处理更大的双 Agent、云端同步或 iOS 复用议题。

---

## 2. 已确认问题

### 2.1 本地内容连续性脆弱

现状：

- 日记、偏好、参考图都保存在浏览器 `localStorage`
- `loadJournals()` 在没有本地数据时会直接回退到 `mockJournals`
- 当前没有数据来源标识，也没有跨 origin / 跨端口迁移策略

结果：

- 一旦访问地址变化，用户会误以为历史内容丢失
- 很难区分“真实空数据”与“只是回退到了 mock”

涉及文件：

- `src/services/memory.ts`
- `src/data/mockJournals.ts`
- `src/App.tsx`
- `src/pages/HomePage.tsx`

### 2.2 自动生成链路不完整

现状：

- 首页“今日自动生成”只会调用自拍生成
- 自动写入的正文是固定文案
- 自动写入的 `voiceMessages` 为空

结果：

- 产品看起来会生图，但不会持续积累真实内容
- 用户无法形成“她每天都在写、都在说”的感知

涉及文件：

- `src/App.tsx`
- `src/services/journalGeneration.ts`
- `src/services/api/contentClient.ts`

### 2.3 人物一致性策略不稳定

现状：

- 一致性依赖 `referenceImage`
- 当前流程会把新自拍的首图作为下一轮参考
- 自动生成链路只在“没有 reference image”时保存一次
- 设置页重新生成形象时会先清空 reference image

结果：

- 角色基准图生命周期不清晰
- 多日连续生成时容易漂移
- 用户会觉得是“类似的人”，不是“同一个人”

涉及文件：

- `src/services/api/mediaClient.ts`
- `src/services/minimax.ts`
- `src/services/memory.ts`
- `src/pages/SettingsPage.tsx`
- `src/App.tsx`

### 2.4 失败不可见或不可诊断

现状：

- 内容生成后端失败时，`contentClient` 会静默回退到本地模板
- 自动生成失败时首页只有弱提示，没有重试入口
- 生成结果来源没有显式展示

结果：

- 用户和开发都很难判断当前结果是：
  - 真正远端生成
  - 本地模板降级
  - 部分生成成功
  - 完全失败

涉及文件：

- `src/services/api/contentClient.ts`
- `src/pages/WritePage.tsx`
- `src/App.tsx`

---

## 3. 修复目标

### P0 目标

1. 用户不会再轻易遇到“昨天有今天没了”的错觉
2. 首页自动生成能够产出完整 journal，而不是只产出自拍
3. 人物参考图有稳定生命周期，不会被随意清空或漂移
4. 失败状态和降级状态在 UI 上可被识别

### 非目标

- 不在本轮引入云端账号体系
- 不在本轮实现双 Agent 编排
- 不在本轮重构整个内容架构

---

## 4. 实施顺序

按下面 4 个 phase 执行，每个 phase 都要求能独立验证。

---

## Phase 1：修复内容“看起来丢失”的连续性问题

### 目标

让本地数据状态可解释，不再把 mock 数据当成真实历史。

### 改动点

1. 修改 `src/services/memory.ts`

- 调整 `loadJournals()` 返回结构
- 不再在“无本地数据”时直接无提示回退 `mockJournals`
- 增加数据来源标识，例如：
  - `mock`
  - `local`
  - `empty`

2. 修改 `src/App.tsx`

- 启动时读取 journals 的同时拿到来源状态
- 将来源状态向首页或全局状态区透传

3. 修改 `src/pages/HomePage.tsx`

- 在非正式环境显示当前数据来源
- 当真实数据为空时展示空态，而不是假装有历史

4. 增加开发迁移策略

- 兼容老的 localStorage key
- 为后续端口切换场景预留迁移逻辑

### 测试

- `src/services/memory.test.ts`
- `src/pages/HomePage.test.tsx` 或新增相关测试

### 验收标准

- 没有本地数据时，首页显示真实空态
- 使用 mock 数据时，UI 有清晰提示
- 用户能明确知道不是“数据被删了”

---

## Phase 2：补齐首页自动生成链路

### 目标

让“今日自动生成”产生完整 journal：正文 + 语音稿 + 自拍/配图。

### 改动点

1. 修改 `src/App.tsx`

将当前自动生成流程改为：

1. 检查今天是否已有 journal
2. 生成 journal draft
3. 生成 voice messages
4. 生成媒体（图片 / 自拍）
5. 保存完整 journal

2. 去掉固定正文

- 删除当前固定文案
- 自动生成内容统一走 `generateJournalDraft()`

3. 去掉空语音占位

- 自动生成 journal 不再写入空 `voiceMessages`

4. 衔接内容生成结果来源

- 若远端失败但本地 fallback 成功，要保留来源信息给 UI

### 涉及文件

- `src/App.tsx`
- `src/services/journalGeneration.ts`
- `src/services/api/contentClient.ts`
- `src/services/minimax.ts`

### 测试

- 新增 / 修改 `App` 自动生成测试
- `src/services/journalGeneration.test.ts`

### 验收标准

- 当天首次进入应用时，可生成完整一篇日记
- journal 至少包含：
  - `content`
  - `voiceMessages`
  - 自拍或配图之一
- 自动生成失败不会写入半成品 journal

---

## Phase 3：收紧人物一致性策略

### 目标

让角色基准图和每日日志自拍分离，减少人物漂移。

### 改动点

1. 扩展存储模型

修改 `src/services/memory.ts`，拆分：

- `characterReferenceImage`
- `latestGeneratedSelfie`

不要再把所有一致性都压在单一 `referenceImage` 上。

2. 修改 `src/services/minimax.ts`

- 不再默认把“本次首张自拍”永久升级为角色主参考图
- 仅在明确策略允许时更新主参考图

3. 修改 `src/App.tsx`

- 自动生成链路优先使用稳定角色主参考图
- 只有在策略允许下才更新 reference

4. 修改 `src/pages/SettingsPage.tsx`

- “重新生成形象”改成显式替换流程
- 不要先 `clearReferenceImage()`
- 至少先生成成功，再决定是否替换旧角色基准图

### 测试

- `src/pages/SettingsPage.test.tsx`
- `src/services/minimax.test.ts`

### 验收标准

- 连续多天生成时，角色外观明显更稳定
- 设置页重生角色失败时，不会丢失旧角色基准图

---

## Phase 4：让失败和降级状态可见

### 目标

把“远端生成”“本地 fallback”“失败未生成”区分清楚。

### 改动点

1. 修改 `src/services/api/contentClient.ts`

返回结构增加元信息，例如：

```ts
type ContentGenerationResult = {
  journalContent: string;
  voiceMessages: VoiceMessage[];
  source: "remote" | "fallback";
  error?: string;
};
```

2. 修改 `src/pages/WritePage.tsx`

- 区分内容失败、语音失败、图片失败、自拍失败
- 区分“已保存草稿但生成失败”与“完整生成成功”

3. 修改 `src/App.tsx`

- 首页自动生成失败时增加重试入口
- 若当前内容来自 fallback，给出弱提示但不要伪装成正式生成

### 测试

- `src/pages/WritePage.test.tsx`
- `src/services/api/contentClient` 相关测试

### 验收标准

- UI 上可区分：
  - 远端生成成功
  - fallback 成功
  - 自动生成失败
- 首页自动生成失败后可以手动重试

---

## 5. 建议开发顺序

推荐按下面顺序推进：

1. `Phase 1`
2. `Phase 2`
3. `Phase 3`
4. `Phase 4`

原因：

- `Phase 1` 先解决“看起来丢了”的认知问题
- `Phase 2` 解决“只会生图不会积累内容”的核心体验问题
- `Phase 3` 再提高人物一致性
- `Phase 4` 最后把状态透明化，便于持续调试和产品验证

---

## 6. 交付检查清单

- [ ] 本地数据来源可识别
- [ ] 空数据时不再伪装成历史内容
- [ ] 今日自动生成产出完整 journal
- [ ] 自动生成不再写入固定正文 + 空语音
- [ ] 角色主参考图和单次自拍结果分离
- [ ] 设置页重生角色不再先删旧参考图
- [ ] 远端生成 / fallback / failure 三种状态可见
- [ ] 首页自动生成失败可重试

