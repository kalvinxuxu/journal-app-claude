# Selfie & Content Orchestration Design

**Date:** 2026-05-13
**Phase:** 5 — Product Deepening
**Status:** Approved

---

## 1. Selfie Active Sharing ("主动分享自拍")

### Trigger Rule
After a journal is saved in `WritePage`, if `journal.images` is empty, trigger `generateSelfies(mood)` automatically.

### Interaction Flow
1. User clicks "保存日记" → journal saved to state
2. Check `journal.images.length === 0`
3. If empty → call `generateSelfies(mood, referenceImage?)`
4. On success → show `SelfiePreviewModal` with the generated selfie
5. User chooses:
   - **"保存到日记"** → append selfie URL to `journal.images`, update journals state
   - **"重新生成"** → call `generateSelfies` again, replace preview
   - **"跳过"** → close modal, no selfie saved
6. On failure → silent fail (no modal, no error toast for this flow)

### New Component
`src/components/SelfiePreviewModal.tsx`

Props:
```ts
type SelfiePreviewModalProps = {
  selfieUrl: string;
  mood: Mood;
  onSave: (selfieUrl: string) => void;
  onRegenerate: () => void;
  onSkip: () => void;
};
```

### Modified Files
- `src/pages/WritePage.tsx` — add trigger logic in `handleSave`
- `src/types/journal.ts` — confirm image/selfie field shape

---

## 2. Content Orchestration — Counselor/Polish Layer

### Approach: Two-Layer Prompt + Post-Processing Filter

**Layer 1 (女友内容生成)**
DeepSeek generates journal content and voice scripts using emotion-style prompt only. No counselor logic mixed in.

**Layer 2 (后处理过滤器)**
`src/services/contentPolish.ts` applies after generation:

```ts
export type PolishResult = {
  journalContent: string;
  voiceScripts: VoiceScript[];
  warnings: string[]; // e.g. "长度超出截断", "检测到重复句"
};

export function polishContent(raw: ContentGenerationResult): PolishResult {
  // 1. Sensitive word filter
  // 2. Length constraint: journal 60-120 chars, voice each 15-20 chars
  // 3. Duplicate sentence detection
  // 4. Tone boundary: not too clingy, not preachy
}
```

### Integration Point
`src/services/journalGeneration.ts` calls `polishContent()` after receiving DeepSeek result, before returning draft.

---

## 3. Recall Mode — Emotional Recall

### Approach: Mood-based recall

Extend `recall()` in `src/services/generator/memoryEngine.ts`:

```ts
recall(mood: Mood, limit = 3): MemoryEntry[] {
  return this.entries
    .filter(e => e.mood === mood)  // same mood priority
    .slice(0, limit);
}
```

### Integration
In `generateJournalDraft()` (`journalGeneration.ts`), before calling DeepSeek:
```ts
const recalledMemory = memoryEngine.recall(mood, 3);
const memoryContext = recalledMemory
  .map(e => ` ${e.date}写过：${e.summary}`)
  .join("");
```

This injects emotionally-matched past entries into the generation prompt.

---

## 4. Implementation Order

1. `src/components/SelfiePreviewModal.tsx` + WritePage integration
2. `src/services/contentPolish.ts` (standalone, testable)
3. `src/services/generator/memoryEngine.ts` — extend `recall()`
4. `src/services/journalGeneration.ts` — integrate recall + polish
5. Tests

---

## 5. Exit Criteria

- [ ] Saving an empty-image journal triggers selfie generation
- [ ] SelfiePreviewModal appears with 3-action choice
- [ ] "保存到日记" appends selfie to journal.images
- [ ] Content polish filters run and pass through valid content
- [ ] Recall returns same-mood entries for generation context
- [ ] No counselor logic leaks into generation prompt