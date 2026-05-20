# 日记图像多样化生成实施计划

> 目标：让日记图像随内容变化，不再每次都像同一套模板。

## 目标

让“日记正文”驱动图像变化，至少影响以下维度：
- 场景
- 活动
- 动作
- 服装
- 光线 / 氛围

同时保持现有行为：
- 生成失败时有清晰降级
- 当前稳定的 reference 图策略不被破坏
- 现有 TTS / 日记保存逻辑不被牵连

## 现状判断

当前图像 prompt 主要依赖：
- mood
- date / weekday
- content 截断片段

这会导致两个问题：
- 不同日记的视觉差异不够
- selfie / 日记图像都容易落到同一套默认风格

## 设计原则

1. 先提取，再拼 prompt，不要在各处重复写规则。
2. extractor 必须是纯函数，测试要覆盖典型内容和兜底内容。
3. 提取结果要允许为空，不要强行编造不匹配的细节。
4. selfie 侧只接收“可视化提示”，不要把 extractor 逻辑散落到多个调用点。

## 代码结构

```
src/
├── services/
│   ├── sceneExtractor.ts
│   ├── sceneExtractor.test.ts
│   ├── minimax.ts
│   ├── minimax.test.ts
│   └── api/
│       └── mediaClient.ts
├── App.tsx
├── pages/
│   ├── WritePage.tsx
│   └── AskHerPage.tsx
```

## 实施任务

### Task 1: 新增场景提取器

目标：
- 从日记正文中提取场景上下文
- 输出稳定、可复用的结构化结果

建议新增类型：

```ts
export type SceneContext = {
  scene: string;
  activity: string;
  action: string;
  clothingHint: string;
  atmosphere: string;
};
```

建议实现：
- 用有限关键词规则做首版
- 为没有命中关键词的情况提供安全默认值
- clothingHint 优先由 mood + 内容共同决定，不要只靠 mood

测试覆盖：
- 咖啡店 / 散步 / 室内 / 雨天等典型内容
- 无关键词时的默认值
- 同一篇内容多次运行结果保持稳定

### Task 2: 让日记图像 prompt 使用 SceneContext

目标：
- `buildJournalImagePrompt()` 直接消费 `SceneContext`
- 提升日记图像的场景差异

建议修改：
- `src/services/minimax.ts`
- 只在这里拼装最终 prompt
- 保留现有 `mood`、`date`、`weekday`、`content hint`
- 增加 scene / activity / action / clothing / atmosphere 的自然语言提示

要避免的做法：
- 不要在多个组件里各写一套 prompt 规则
- 不要把 extractor 逻辑塞进 UI 层

### Task 3: 让自拍生成也能吃到可视化提示

目标：
- 自拍图片在保持角色一致性的前提下，也能随内容变化

建议修改：
- `src/services/api/mediaClient.ts`
- 让 `generateSelfies()` 支持可选的 `visualHints` 或 `sceneContext`
- `src/services/minimax.ts`
- `generateGirlfriendSelfies()` 负责把 `SceneContext` 转成 prompt hint

推荐的数据流：
- 在生成日记时得到正文
- 用正文提取 `SceneContext`
- `buildJournalImagePrompt()` 用一份
- `generateGirlfriendSelfies()` 用另一份，但共享同一个 extractor 输出

要避免的做法：
- 不要在 `generateGirlfriendSelfies()` 里仅用 `mood` 伪造场景
- 不要让 selfie 逻辑依赖随机临时字符串作为主要差异来源

### Task 4: 接入调用点

需要检查并更新的地方：
- `src/App.tsx`
- `src/pages/WritePage.tsx`
- `src/pages/AskHerPage.tsx`

原则：
- 只在已有内容可用时传 `SceneContext`
- 没有正文时走旧的安全默认 prompt
- 不要破坏现有 reference 图保存逻辑

### Task 5: 验证

先跑最小验证：
- `src/services/sceneExtractor.test.ts`
- `src/services/minimax.test.ts`
- `src/pages/WritePage.test.tsx`
- `src/pages/AskHerPage.test.tsx`

再跑构建：
- `npm run build:raw`

如果图片链路改动较大，再补一轮相关页面手动验证。

## 风险点

1. 过度提取会让 prompt 变长，反而影响图像质量，所以要控制字段数量。
2. 如果 extractor 误判，prompt 会变得“看起来很具体但实际不对”，所以默认值必须安全。
3. selfie 一侧不要过度依赖 reference URL，避免历史资源失效后随机失败。
4. 当前逻辑里有多个生成入口，修改时要逐个接入，不要只改一个页面。

## 验收标准

- 日记图像在不同内容下能明显区分场景和动作
- 同一篇日记生成结果稳定
- selfie 在内容相关时能体现服装 / 氛围差异
- 没有破坏现有 TTS、保存、reference 图流程
- 相关测试通过，`npm run build:raw` 通过

## 建议实施顺序

1. 先做 `sceneExtractor.ts` 和测试。
2. 再让 `buildJournalImagePrompt()` 使用提取结果。
3. 再把提取结果接到自拍生成。
4. 最后改调用点并做回归验证。
