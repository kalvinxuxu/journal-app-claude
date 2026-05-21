# 日记图像 + 自拍独立性修复计划

> 状态：待 review

## 问题描述

### Issue 1: 日记图像与自拍互不独立

**当前行为**（WritePage.tsx:108-118）：
```
handleSave()
  └── buildJournalMedia(draft)
        ├── generateMinimaxImages(buildJournalImagePrompt(...))  → 生成 journal images
        └── synthesizeVoiceMessages(...)
              └── 返回 journal（有 images）

  // 自拍触发条件
  if (!result.journal.images || result.journal.images.length === 0) {
        generateGirlfriendSelfies(...)
  }
```

**问题**：`buildJournalMedia` 成功时 `journal.images` 必然有值， selfie 分支永远不执行。两者被串行合并而非并行独立。

### Issue 2: 日记图像无人物一致性

**当前 prompt**（minimax.ts `buildJournalImagePrompt`）：
```
写实生活摄影风格。像手机记录的真实日常场景。
Mood: X. Date: Y. Scene: Z. Activity: A. Action: B. Clothing: C. Atmosphere: D.
Content hint: ...
```

**问题**：没有角色描述，只有场景 + 动作 + 服装元素。生成的是"风景+人物"，而不是"女朋友在场景中"。参考图 `referenceImage` 也没有传入。

---

## 修复方案

### Task 1: 重构 `buildJournalMedia`，日记图像和自拍并行生成

**目标**：`buildJournalMedia` 不再内部调用 selfie 生成，而是返回两个独立结果。让 `handleSave` 在保存前同时拿到两种图像。

**修改文件**：`src/services/minimax.ts`

```ts
// 新增返回类型
export type JournalMediaResult = {
  journal: Journal;
  errors: JournalMediaErrors;
  selfies?: {
    morningSelfie?: string;
    eveningSelfie?: string;
    latestSelfie?: string;
  };
};

// 重构 buildJournalMedia
export async function buildJournalMedia(
  journal: Journal,
  options?: {
    referenceImage?: string;
    generateSelfies?: boolean;
  }
) {
  const { referenceImage, generateSelfies = true } = options ?? {};

  let imageError: string | undefined;
  let images = journal.images?.length ? journal.images : undefined;

  // 并行生成日记图像和语音
  const [imageResult, voiceResult] = await Promise.allSettled([
    images ? Promise.resolve(undefined) : generateMinimaxImages(buildJournalImagePrompt(journal, { referenceImage }), // 传 referenceImage
    synthesizeVoiceMessages(journal.voiceMessages, { mood: journal.mood, voiceStyle: journal.voiceStyle }),
  ]);

  // 处理图像结果
  if (imageResult.status === "rejected") {
    imageError = `图片生成失败：${imageResult.reason}`;
  } else if (imageResult.value) {
    images = imageResult.value;
  }

  // 处理语音结果
  const voiceErrors = voiceResult.status === "rejected"
    ? [`语音生成失败：${voiceResult.reason}`]
    : (voiceResult.value as Awaited<ReturnType<typeof synthesizeVoiceMessages>>).errors;

  // 自拍生成（如果启用）
  let selfieResult: GirlfriendSelfieResult | undefined;
  if (generateSelfies && referenceImage) {
    selfieResult = await generateGirlfriendSelfies(journal.mood, referenceImage, journal.content, journal.date);
  }

  return {
    journal: { ...journal, images, voiceMessages: voiceResult.value?.voiceMessages ?? journal.voiceMessages },
    errors: { image: imageError, voice: voiceErrors?.[0] },
    selfies: selfieResult ? { ...selfieResult } : undefined,
  };
}
```

**关键变化**：
- `buildJournalMedia` 返回结构新增 `selfies` 字段
- 日记图像和语音**并行**生成
- `generateSelfies` 由调用方控制是否启用（"我来写"不需要，"她来写"需要）
- `referenceImage` 透传给 `buildJournalImagePrompt`

---

### Task 2: `buildJournalImagePrompt` 支持角色一致性

**目标**：日记图像 prompt 包含角色描述和参考图，让 MiniMax 生成"女朋友在这个场景"而非纯风景。

**修改文件**：`src/services/minimax.ts`

```ts
const GIRLFRIEND_DESCRIPTION = `
Asian young woman, long black hair naturally flowing,
soft facial features, gentle smiling eyes,
light colored casual top (white or pale pink),
overall vibe: fresh, gentle, approachable, slightly playful.
Style reference: Japanese lifestyle photography, natural non-edited look.
`.trim();

export function buildJournalImagePrompt(
  journal: Pick<Journal, "mood" | "content" | "date" | "weekday">,
  options?: {
    referenceImage?: string;
    extra?: string;
  },
) {
  const uniqueHint = options?.extra ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const sceneContext = extractSceneContext(journal.content, journal.mood, journal.date);

  const parts = [
    GIRLFRIEND_DESCRIPTION,  // 新增：角色基础描述
    "写实生活摄影风格。",
    "像手机或轻写真记录下来的真实日常场景。",
    `Mood: ${journal.mood}.`,
    `Date: ${journal.date} ${journal.weekday}.`,
    `Scene: ${sceneContext.scene}.`,
    `Activity: ${sceneContext.activity}.`,
    `Action: ${sceneContext.action}.`,
    `Clothing: ${sceneContext.clothingHint}.`,
    `Atmosphere: ${sceneContext.atmosphere}.`,
    `Content hint: ${journal.content.slice(0, 120)}.`,
    `Unique scene token: ${uniqueHint}`,
    "No text overlays. Natural lighting. Human, believable, intimate daily life.",
  ];

  return parts.join(" ");
}
```

**注意**：`GIRLFRIEND_DESCRIPTION` 从 `generateSelfies` 的 `mediaClient.ts` 中复用，保持一致。

---

### Task 3: WritePage 传 `referenceImage` 给日记图像生成

**目标**：`WritePage` 调用 `buildJournalMedia` 时传入 `loadReferenceImage()`，确保"我来写"生成的日记图像也有人物一致性。

**修改文件**：`src/pages/WritePage.tsx`

```ts
// handleSave 中的变化
const result = await buildJournalMedia(draft, {
  referenceImage: loadReferenceImage() ?? undefined,
  generateSelfies: false,  // "我来写" 不生成自拍
});

// 自拍逻辑移除（由 buildJournalMedia 内部处理）
// 旧代码：if (!result.journal.images...) → 删除

await onSave(result.journal);
```

**关键变化**：WritePage 传入 `referenceImage`，日记图像通过 `subject_reference` 保持角色一致性，不再只是场景。

---

### Task 4: 更新调用方 WritePage.tsx - 移除旧 selfie 触发逻辑

**目标**：WritePage 原有 `if (!result.journal.images...)` 触发 `generateGirlfriendSelfies` 的逻辑移除，selfie 生成改由 `buildJournalMedia` 统一控制。

---

### Task 5: 更新调用方 AskHerPage.tsx

**目标**：`AskHerPage` 的 `handleSave` 调用保持不变（仍使用 `buildJournalMedia`），但现在需要处理 `selfies` 字段并展示自拍预览。

**修改文件**：`src/pages/AskHerPage.tsx`

```ts
// handleSave 中的变化
const result = await buildJournalMedia(draft, {
  referenceImage: loadReferenceImage() ?? undefined,
  generateSelfies: true,  // "她来写" 生成自拍
});

// 如果有自拍结果，设置预览
if (result.selfies?.morningSelfie) {
  setSelfiePreview({ url: result.selfies.morningSelfie, journalId: draft.id });
}
```

---

### Task 6: 补充测试

**修改文件**：`src/services/minimax.test.ts`

新增测试用例：
- `buildJournalMedia` 并行生成时 `images` 和 `voiceMessages` 同时有值
- `buildJournalImagePrompt` 包含 `GIRLFRIEND_DESCRIPTION`
- `generateSelfies: false` 时不触发 selfie 生成

---

## 风险点

1. `buildJournalMedia` 并行化后错误处理更复杂，需要确保一个失败不影响另一个
2. 引入 `referenceImage` 后，`buildJournalImagePrompt` 的 prompt 会更长，需要验证 MiniMax API 不截断
3. 自拍生成是可选的，老调用方（直接用 `generateGirlfriendSelfies`）不受影响

---

## 验收标准

- [ ] WritePage 保存日记后，日记图像和自拍**同时**生成并保存
- [ ] 日记图像中能看到"女朋友"人物，而非纯场景
- [ ] AskHerPage 保存日记后，自拍正常展示
- [ ] 所有现有测试通过
- [ ] `npm run build:raw` 通过