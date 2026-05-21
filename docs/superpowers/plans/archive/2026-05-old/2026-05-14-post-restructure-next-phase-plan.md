# Post-Restructure Next Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the journal-entry restructure lands, make the product actually reliable by stabilizing content generation, realistic media generation, persisted night bonus selfie behavior, `voiceStyle` behavior, and first export support.

**Architecture:** Keep the new dual-entry + unified-journal UI intact, and improve the platform underneath it in vertical slices. First stabilize backend text generation and media outputs, then persist night bonus behavior, then wire settings into behavior, then add one real export path.

**Tech Stack:** React, TypeScript, Vite, Vitest, Express backend, MiniMax media APIs, content provider abstraction, localStorage persistence

---

## File Structure

### Create

- `backend/src/providers/contentProvider.ts`
- `backend/src/providers/minimaxContentProvider.ts`
- `backend/src/providers/deepseekContentProvider.ts` (only if fallback provider is activated)
- `backend/src/utils/contentSanitizer.ts`
- `backend/src/utils/contentSanitizer.test.ts`
- `src/services/exportPdf.ts` or `src/services/exportDocument.ts`
- `src/services/exportPdf.test.ts`

### Modify

- `backend/src/index.ts`
- `src/services/api/contentClient.ts`
- `src/services/journalGeneration.ts`
- `src/services/minimax.ts`
- `src/services/nightBonusSelfie.ts`
- `src/services/memory.ts`
- `src/pages/SettingsPage.tsx`
- `src/types/journal.ts`
- `src/components/InlineVoiceBar.tsx` (if `voiceStyle` display hooks are needed)

### Existing tests to extend

- `src/services/journalGeneration.test.ts`
- `src/services/minimax.test.ts`
- `src/services/nightBonusSelfie.test.ts`
- `src/pages/SettingsPage.test.tsx`
- `src/services/reminders.test.ts`

---

## Task 1: Stabilize `/api/content-generation`

**Files:**
- Modify: `backend/src/index.ts`
- Create: `backend/src/utils/contentSanitizer.ts`
- Create/Test: `backend/src/utils/contentSanitizer.test.ts`
- Modify: `src/services/api/contentClient.ts`

- [ ] **Step 1: Write failing sanitizer tests**

Add tests for:

```ts
expect(stripContentPrefix("用户希望我作为AI女友写日记。\n今天风很轻。")).toBe("今天风很轻。");
expect(stripContentPrefix("让我来写：\n早安|起床啦")).toBe("早安|起床啦");
expect(stripThinkBlocks("<think>...</think>\n今天想你了")).toBe("今天想你了");
```

Run:

```bash
npm test -- backend/src/utils/contentSanitizer.test.ts
```

Expected:

- fails because sanitizer utilities do not exist yet

- [ ] **Step 2: Extract backend sanitization utilities**

Create `backend/src/utils/contentSanitizer.ts`:

```ts
export function stripThinkBlocks(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export function stripContentPrefix(text: string) {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return "";
  const first = paragraphs[0];
  if (/^(用户希望|让我来|我来为你|以下是|帮你写|写一段)/.test(first)) {
    return paragraphs.slice(1).join("\n").trim();
  }
  return paragraphs.join("\n").trim();
}
```

- [ ] **Step 3: Apply sanitization before backend response**

Update `backend/src/index.ts` so both `rawJournal` and `rawScripts` pass through:

```ts
rawJournal = stripContentPrefix(stripThinkBlocks(rawJournal));
rawScripts = stripContentPrefix(stripThinkBlocks(rawScripts));
```

Also add conservative fallback behavior if:

- journal content becomes empty
- fewer than 3 script lines parse correctly

- [ ] **Step 4: Keep frontend fallback simple**

In `src/services/api/contentClient.ts`, keep current local fallback behavior but do not add client-side regex cleaning unless backend still leaks dirty content during testing.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- backend/src/utils/contentSanitizer.test.ts src/services/journalGeneration.test.ts
```

Expected:

- sanitized content is clean enough for UI rendering

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts backend/src/utils/contentSanitizer.ts backend/src/utils/contentSanitizer.test.ts src/services/api/contentClient.ts
git commit -m "fix: sanitize content-generation output before returning to clients"
```

---

## Task 2: Add Content Provider Abstraction and DeepSeek Fallback Path

**Files:**
- Create: `backend/src/providers/contentProvider.ts`
- Create: `backend/src/providers/minimaxContentProvider.ts`
- Create: `backend/src/providers/deepseekContentProvider.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write failing provider contract tests**

Define the shared output shape:

```ts
type ProviderOutput = {
  journalContent: string;
  voiceScripts: Array<{ timing: "morning" | "afternoon" | "night"; transcript: string; duration: string }>;
};
```

Run a contract test ensuring both provider implementations can return that shape.

- [ ] **Step 2: Extract MiniMax content generation into provider**

Move current MiniMax content-generation logic from `backend/src/index.ts` into:

- `backend/src/providers/minimaxContentProvider.ts`

Keep endpoint logic thin.

- [ ] **Step 3: Add optional DeepSeek provider**

Add provider scaffold that activates only if:

- `DEEPSEEK_API_KEY` is present
- or `CONTENT_PROVIDER=deepseek`

The endpoint should still return the same response shape.

- [ ] **Step 4: Add provider selection**

In `backend/src/index.ts`:

```ts
const provider = process.env.CONTENT_PROVIDER === "deepseek"
  ? createDeepSeekContentProvider()
  : createMiniMaxContentProvider();
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- backend/src/utils/contentSanitizer.test.ts src/services/journalGeneration.test.ts
```

Expected:

- frontend contract remains unchanged while backend provider becomes swappable

- [ ] **Step 6: Commit**

```bash
git add backend/src/providers backend/src/index.ts
git commit -m "refactor: abstract content generation provider with minimax-first strategy"
```

---

## Task 3: Stabilize Realistic Journal Media and Selfie Layers

**Files:**
- Modify: `src/services/minimax.ts`
- Modify: `src/services/minimax.test.ts`
- Modify: `src/services/nightBonusSelfie.ts`

- [ ] **Step 1: Write failing prompt tests**

Add assertions that:

```ts
expect(buildJournalImagePrompt(journal)).toContain("写实");
expect(buildJournalImagePrompt(journal)).toContain("自然光");
expect(buildNightBonusPrompt("开心")).toContain("睡衣");
expect(buildNightBonusPrompt("开心")).toContain("甜心感");
```

Run:

```bash
npm test -- src/services/minimax.test.ts src/services/nightBonusSelfie.test.ts
```

Expected:

- tests fail if prompts are still too vague or still illustration-oriented

- [ ] **Step 2: Separate three media prompt roles**

Ensure prompts are distinct for:

1. journal realistic scene image
2. daytime normal selfie
3. night bonus sleepwear selfie

- [ ] **Step 3: Keep selfie persona stable**

Document and enforce one stable persona in prompt constants:

- sunny
- loves taking selfies
- attractive / fit
- bright and affectionate

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/services/minimax.test.ts src/services/nightBonusSelfie.test.ts
```

Expected:

- the three media layers remain semantically distinct

- [ ] **Step 5: Commit**

```bash
git add src/services/minimax.ts src/services/minimax.test.ts src/services/nightBonusSelfie.ts src/services/nightBonusSelfie.test.ts
git commit -m "feat: separate realistic journal, selfie, and night bonus media prompts"
```

---

## Task 4: Finish Persisted Night Bonus Selfie Flow

**Files:**
- Modify: `src/services/nightBonusSelfie.ts`
- Modify: `src/App.tsx`
- Modify: `src/services/memory.ts`
- Modify: `src/components/JournalCard.tsx`

- [ ] **Step 1: Write failing persistence tests**

Add tests for:

```ts
expect(savedJournal.nightBonusSelfie).toBeDefined();
expect(reloadedJournal.nightBonusSelfie).toEqual(savedJournal.nightBonusSelfie);
expect(secondNightOpenDoesNotRegenerate).toBe(true);
```

Run:

```bash
npm test -- src/services/nightBonusSelfie.test.ts src/services/memoryRebuild.e2e.test.ts
```

Expected:

- fails if bonus selfie is not yet saved/reloaded correctly

- [ ] **Step 2: Make generation idempotent**

Ensure `shouldGenerateNightBonus` gates on:

- current hour
- journal already having `nightBonusSelfie`
- generation-in-flight guard if needed

- [ ] **Step 3: Persist on success**

When bonus selfie generation succeeds, write it back to the matching journal in app state so the existing journal persistence effect stores it.

- [ ] **Step 4: Add a clear UI section**

Render a dedicated block labeled:

```tsx
<p className="selfie-label">夜间加餐</p>
```

Do not mix this image into the normal `selfies` strip.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/services/nightBonusSelfie.test.ts src/services/memoryRebuild.e2e.test.ts src/components/JournalCard.test.tsx
```

Expected:

- night bonus appears once and persists across reload

- [ ] **Step 6: Commit**

```bash
git add src/services/nightBonusSelfie.ts src/App.tsx src/services/memory.ts src/components/JournalCard.tsx
git commit -m "feat: persist night bonus selfie as a one-time journal add-on"
```

---

## Task 5: Make `voiceStyle` Actually Affect Behavior

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/services/api/contentClient.ts`
- Modify: `src/services/journalGeneration.ts`
- Modify: `src/services/minimax.ts`
- Test: `src/pages/SettingsPage.test.tsx`
- Test: `src/services/journalGeneration.test.ts`

- [ ] **Step 1: Write failing behavior tests**

Add assertions that style is not just stored but forwarded:

```ts
expect(capturedRequest.voiceStyle).toBe("playful");
expect(buildVoiceSetting("开心", "playful")).toMatchObject(...);
```

Run:

```bash
npm test -- src/pages/SettingsPage.test.tsx src/services/journalGeneration.test.ts
```

Expected:

- fails because `voiceStyle` is not yet consistently shaping both script generation and TTS

- [ ] **Step 2: Extend content generation input**

Ensure `voiceStyle` is forwarded from settings into:

- `generateJournalDraft`
- `generateJournalContent`
- backend `/api/content-generation`

- [ ] **Step 3: Map style into TTS behavior**

Update `src/services/minimax.ts` helper(s) so `voiceStyle` influences:

- selected voice id
- or tone/emotion settings
- or both

Keep mappings small and explicit:

```ts
soft -> gentle / lighter
warm -> warm / intimate
playful -> brighter / teasing
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/pages/SettingsPage.test.tsx src/services/journalGeneration.test.ts src/services/minimax.test.ts
```

Expected:

- style changes now alter downstream generation inputs

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/services/api/contentClient.ts src/services/journalGeneration.ts src/services/minimax.ts
git commit -m "feat: make voice style influence script and tts generation"
```

---

## Task 6: Add First Real Export Path

**Files:**
- Create: `src/services/exportPdf.ts`
- Create/Test: `src/services/exportPdf.test.ts`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/types/journal.ts`

- [ ] **Step 1: Write failing export tests**

Define a first export contract, for example:

```ts
expect(buildJournalPdfDocument(sampleJournal)).toContain(sampleJournal.content);
expect(buildJournalPdfDocument(sampleJournal)).toContain("夜间加餐");
```

Run:

```bash
npm test -- src/services/exportPdf.test.ts
```

Expected:

- fails because PDF export module does not exist

- [ ] **Step 2: Implement one export path only**

Start with PDF export. The service should accept one `Journal` and generate a document representation or downloadable blob.

Keep scope narrow:

- one journal at a time
- content + images + selfie sections + voice transcript summaries

- [ ] **Step 3: Wire export mode**

In settings, keep `exportMode` but only enable working behavior for:

- `pdf`

If `image` is not implemented yet, show a clear message rather than fake support.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/services/exportPdf.test.ts src/pages/SettingsPage.test.tsx
```

Expected:

- one real export path exists and unsupported export modes fail honestly

- [ ] **Step 5: Commit**

```bash
git add src/services/exportPdf.ts src/services/exportPdf.test.ts src/pages/SettingsPage.tsx
git commit -m "feat: add first working pdf export path"
```

---

## Task 7: Final Regression Pass

**Files:**
- All touched files above

- [ ] **Step 1: Run focused next-phase suite**

Run:

```bash
npm test -- \
  src/services/journalGeneration.test.ts \
  src/services/minimax.test.ts \
  src/services/nightBonusSelfie.test.ts \
  src/services/memoryRebuild.test.ts \
  src/services/memoryRebuild.e2e.test.ts \
  src/pages/SettingsPage.test.tsx \
  src/services/reminders.test.ts \
  src/services/exportPdf.test.ts
```

Expected:

- all next-phase tests pass

- [ ] **Step 2: Manual verification**

Run:

```bash
npm run dev
```

Check:

- content generation no longer leaks obvious “用户希望我…” prefixes
- realistic media still renders
- night bonus selfie appears once and stays saved
- changing `voiceStyle` changes downstream generation behavior
- PDF export path is usable

- [ ] **Step 3: Commit**

```bash
git add backend src
git commit -m "feat: stabilize post-restructure generation and settings behaviors"
```

---

## Recommended Execution Order

1. Task 1: backend content sanitization
2. Task 2: provider abstraction
3. Task 3: realistic media role separation
4. Task 4: persisted night bonus selfie
5. Task 5: `voiceStyle` behavior
6. Task 6: PDF export
7. Task 7: regression pass

---

## Stop Conditions

Do not continue tuning prompts indefinitely if:

- sanitizer still leaves frequent junk prefixes after Task 1
- MiniMax-M2.7 still produces unstable content after Task 2 scaffolding

At that point, activate the DeepSeek provider and keep the frontend contract unchanged.
