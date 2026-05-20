# 日记图像一致性与多样化提升实施方案

> 目标：在保持“同一个女友角色”稳定的前提下，让日记图像和自拍图像随正文变化，体现不同场景、动作、神态、穿着和氛围。

## 背景

`2026-05-15-diary-image-diversity.md` 对“日记图像多样化”做了首轮设计，当前仓库也已经有首版落地：

- 已有 `sceneExtractor.ts`
- 已有 `buildJournalImagePrompt()` 接入 `SceneContext`
- 已有 `generateGirlfriendSelfies()` 对 `clothingHint` 的消费
- 相关测试和构建当前可通过

但从实现结果看，这一轮还没有完全达到“角色一致，但场景/动作/神态/穿着都能变化”的目标，仍需要补一轮提升。

## 当前完成情况判断

### 已完成部分

1. 已建立场景提取层，避免 UI 层散落 prompt 规则。
2. 日记主图 prompt 已消费 `scene / activity / action / clothing / atmosphere`。
3. 自拍链路已开始复用正文提取结果，但目前只接入了 `clothingHint`。
4. 相关测试存在，基础回归链路可跑通。

### 当前缺口

1. 同一篇日记的主图 prompt 仍不稳定。
   `buildJournalImagePrompt()` 里仍使用 `Date.now()` 和 `Math.random()` 生成随机 token，这会让相同输入每次 prompt 不同。

2. 自拍的“内容驱动变化”还不完整。
   目前 `generateSelfies()` 只接收 `clothingHint`，没有真正消费：
   - `scene`
   - `action`
   - `atmosphere`
   - `expression`

3. 基础人物描述里仍然写死了特定场景和穿着。
   当前固定描述仍包含：
   - 粉色粗花呢套装
   - 粉色手袋
   - 艺术展馆 / anime posters

   这会和“按内容变化服装与背景”的目标互相冲突。

4. 目前 `SceneContext` 还没有单独表达“神态 / expression”。
   `atmosphere` 更偏环境氛围，不足以稳定驱动人物表情或面部状态。

5. 仍有部分调用点没有把正文内容传到自拍链路。
   这些路径会退回到只靠 `mood` 或 reference 图，导致变化不足。

## 本轮提升目标

在不破坏当前 reference 图策略、TTS、保存逻辑和已有任务系统的前提下，实现以下效果：

1. 同一篇日记，多次生成时 prompt 结构稳定。
2. 不同日记内容，可显著改变：
   - 场景
   - 动作
   - 神态
   - 穿着
   - 光线 / 氛围
3. 自拍与主图共享同一份内容提取结果，但使用各自适合的 prompt 组织方式。
4. 固定人物特征只负责“她是谁”，可变提示负责“她此刻在哪里、在做什么、是什么状态”。

## 设计原则

1. “人物锚点”和“可变视觉提示”必须拆开。
2. extractor 继续保持纯函数，不在调用层临时拼业务规则。
3. 相同输入必须得到相同 `SceneContext` 和相同 prompt。
4. selfie 和 journal image 共享同一个结构化输出，不共享硬编码句子。
5. 没有正文时允许降级，但降级分支必须显式、可测试。

## 代码范围

本轮只改以下直接相关文件：

```text
src/services/sceneExtractor.ts
src/services/sceneExtractor.test.ts
src/services/minimax.ts
src/services/minimax.test.ts
src/services/api/mediaClient.ts
src/App.tsx
src/pages/WritePage.tsx
src/pages/AskHerPage.tsx
src/pages/WritePage.test.tsx
src/pages/AskHerPage.test.tsx
```

## 实施任务

### Task 1: 升级 `SceneContext` 结构

目标：
- 补齐“神态”维度
- 为主图和自拍图同时提供稳定输入

建议结构：

```ts
export type SceneContext = {
  scene: string;
  activity: string;
  action: string;
  expression: string;
  clothingHint: string;
  atmosphere: string;
};
```

要求：
- `expression` 由正文关键词和 mood 联合决定
- 无命中时走安全默认值
- 输出仍保持稳定纯函数特性

测试补充：
- 开心、想念、平静等 mood 下的默认神态
- 同一输入多次调用，`expression` 保持稳定

### Task 2: 拆分固定人物锚点与可变提示

目标：
- 保留角色一致性
- 去除与多样化冲突的写死场景和穿着

建议改法：

1. 在 `minimax.ts` 和 `mediaClient.ts` 中重写基础角色描述，只保留稳定身份特征，例如：
   - 年轻亚洲女性
   - 长黑发
   - 柔和五官
   - 自然生活摄影风格

2. 从基础描述中移除固定内容：
   - 固定服装
   - 固定包
   - 固定展馆背景

3. 将服装、背景、动作、神态改为后续可变字段注入。

验收点：
- 基础人物描述不再直接锁死某一套衣服和某一个场景

### Task 3: 去掉主图 prompt 的随机性

目标：
- 满足“同一篇日记生成结果稳定”

当前问题：
- `buildJournalImagePrompt()` 使用随机 token，导致相同内容每次 prompt 不同

建议改法：
- 删除 `Date.now()` / `Math.random()`
- 如确实需要差异标识，改用稳定 token，例如基于：
  - `journal.date`
  - `journal.mood`
  - `journal.content`

  计算短 hash

验收点：
- 相同 `journal` 输入时，`buildJournalImagePrompt()` 返回完全一致的字符串

### Task 4: 让自拍链路消费完整 visual hints

目标：
- 自拍不只换衣服，还要体现正文对应的场景、动作、神态、氛围

建议改法：

1. 扩展 `generateSelfies()` 参数：

```ts
type SelfieVisualHints = {
  scene?: string;
  action?: string;
  expression?: string;
  clothingHint?: string;
  atmosphere?: string;
};
```

2. 在 `mediaClient.ts` 中，把这些字段拼进 selfie prompt。

3. 在 `generateGirlfriendSelfies()` 中，不再只取 `clothingHint`，而是把 `SceneContext` 映射成完整 visual hints。

要求：
- reference 图仍然是“角色一致性”主手段
- visual hints 只负责“这次长什么样、在做什么”

### Task 5: 补齐调用点

目标：
- 让已有正文的路径都能把内容传给 selfie 生成

重点检查：
- `src/App.tsx`
- `src/pages/WritePage.tsx`
- `src/pages/AskHerPage.tsx`

规则：
- 已有正文时，传 `content + date`
- 无正文时，允许走无内容降级分支
- 不改变现有 reference 图保存策略

特别注意：
- 自动生成入口
- 手动补生成入口
- 自拍重生成入口

### Task 6: 补测试，锁定这轮行为

最低测试范围：

1. `sceneExtractor.test.ts`
   - 新增 `expression` 覆盖
   - 验证稳定性

2. `minimax.test.ts`
   - 验证 `buildJournalImagePrompt()` 对同一输入稳定
   - 验证 prompt 包含 `scene/action/expression/clothing/atmosphere`
   - 验证 `generateGirlfriendSelfies()` 会把完整 visual hints 传下去

3. 页面测试
   - 验证相关入口在有正文时会把内容带入自拍链路

## 风险点

1. prompt 变长过快，可能反而降低出图质量。
2. 如果 `expression` 规则过粗，容易出现“氛围对了，但脸不对”的情况。
3. 角色锚点删得太多，可能损失一致性；删得太少，又会压制多样化。
4. 多入口接线容易漏一个，导致线上表现不一致。

## 验收标准

达到以下标准，才算本轮提升完成：

1. 同一篇日记，多次调用 `buildJournalImagePrompt()` 输出一致。
2. 不同正文内容下，主图能明显区分场景、动作、氛围。
3. 自拍链路能体现至少以下 4 个变化维度中的 3 个：
   - 场景
   - 神态
   - 动作
   - 穿着
4. 基础人物描述不再锁死固定服装和固定背景。
5. reference 图策略、保存流程、TTS、任务系统不被破坏。
6. 相关测试通过，`npm run build:raw` 通过。

## 建议实施顺序

1. 先改 `SceneContext`，补 `expression`。
2. 再清理固定人物描述，拆开“锚点”和“可变提示”。
3. 去掉主图 prompt 的随机 token。
4. 扩展 selfie visual hints，并在 `generateGirlfriendSelfies()` 中接上。
5. 补齐各入口调用点。
6. 跑最小测试集与构建验证。

## 最终交付物

本轮完成后，应交付以下结果：

- 更稳定的 `SceneContext`
- 不再写死服装/背景的角色锚点 prompt
- 支持完整 visual hints 的 selfie 生成链路
- 覆盖稳定性与接线行为的测试
- 一次通过的最小回归验证和构建验证
