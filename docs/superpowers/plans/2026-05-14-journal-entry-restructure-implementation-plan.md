# Journal Entry Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app around two clear entry paths (`我来写`, `请她写`) while unifying all final output into one journal-entry experience with inline voice, realistic imagery, selfies, and night bonus selfie support.

**Architecture:** Keep the journal display model unified and move divergence to entry flows only. First reshape domain types and navigation, then split write/generate flows, then merge voice back into the journal card/detail layer, and finally add night bonus selfie persistence without re-opening the whole generation stack.

**Tech Stack:** React, TypeScript, Vite, Vitest, localStorage-backed persistence, backend media/content generation endpoints

---

## File Structure

### Create

- `src/pages/AskHerPage.tsx`
- `src/pages/AskHerPage.test.tsx`
- `src/components/InlineVoiceBar.tsx`
- `src/components/InlineVoiceBar.test.tsx`
- `src/services/nightBonusSelfie.ts`
- `src/services/nightBonusSelfie.test.ts`

### Modify

- `src/types/journal.ts`
- `src/App.tsx`
- `src/components/Header.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/WritePage.tsx`
- `src/components/JournalCard.tsx`
- `src/components/JournalList.tsx` (if props need extending)
- `src/services/journalGeneration.ts`
- `src/services/api/contentClient.ts`
- `src/services/minimax.ts`
- `src/services/memory.ts`

### Keep but downgrade/remove from primary flow

- `src/pages/VoicePage.tsx`
- `src/pages/VoicePage.test.tsx`
- `src/pages/VoicePage.journalNav.test.tsx`

---

## Task 1: Reshape Domain Model and Navigation

**Files:**
- Modify: `src/types/journal.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/components/Header.tsx` via existing UI smoke coverage

- [ ] **Step 1: Write the failing type-level and navigation expectations**

Add/update tests so the app expects:

```tsx
expect(screen.getByRole("button", { name: "我来写" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "请她写" })).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "语音" })).not.toBeInTheDocument();
```

Run:

```bash
npm test -- src/pages/WritePage.test.tsx src/pages/VoicePage.test.tsx
```

Expected:

- tests fail because the current nav and homepage still expose `写日记` and `语音`

- [ ] **Step 2: Extend `Journal` and `AppPage` types**

Update `src/types/journal.ts`:

```ts
export type JournalSource = "user" | "girlfriend";

export type Journal = {
  id: string;
  date: string;
  weekday: string;
  mood: Mood;
  source: JournalSource;
  content: string;
  images?: string[];
  selfies?: string[];
  nightBonusSelfie?: string;
  referenceImage?: string;
  voiceMessages: VoiceMessage[];
  voiceStyle?: "soft" | "warm" | "playful";
};

export type AppPage = "home" | "write" | "ask-her" | "settings";
```

- [ ] **Step 3: Rewire top-level navigation**

Update `src/components/Header.tsx` tabs to:

```ts
const tabs: { id: AppPage; label: string }[] = [
  { id: "home", label: "首页" },
  { id: "write", label: "我来写" },
  { id: "ask-her", label: "请她写" },
  { id: "settings", label: "设置" },
];
```

Update `src/pages/HomePage.tsx` hero actions to:

```tsx
<button type="button" className="primary-button" onClick={onCreateNew}>
  我来写
</button>
<button type="button" className="ghost-button" onClick={onAskHerWrite}>
  请她写
</button>
```

Update `HomePageProps` accordingly.

- [ ] **Step 4: Rewire app routing**

Update `src/App.tsx` route switching:

```tsx
{activePage === "write" ? (
  <WritePage
    onSave={handleSaveJournal}
    onCancel={() => handleNavigate("home")}
    voiceStyle={preferences.voiceStyle}
  />
) : null}

{activePage === "ask-her" ? (
  <AskHerPage
    onSave={handleSaveJournal}
    onCancel={() => handleNavigate("home")}
    voiceStyle={preferences.voiceStyle}
  />
) : null}
```

Also remove the `VoicePage` branch from primary navigation flow.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/pages/WritePage.test.tsx src/pages/VoicePage.test.tsx
```

Expected:

- updated navigation tests pass
- voice-page nav tests may fail until Task 4; note and continue only if those failures match expected transition work

- [ ] **Step 6: Commit**

```bash
git add src/types/journal.ts src/App.tsx src/components/Header.tsx src/pages/HomePage.tsx
git commit -m "feat: split journal entry into dual home actions"
```

---

## Task 2: Split Entry Flows into `我来写` and `请她写`

**Files:**
- Modify: `src/pages/WritePage.tsx`
- Create: `src/pages/AskHerPage.tsx`
- Modify: `src/services/journalGeneration.ts`
- Modify: `src/services/api/contentClient.ts`
- Test: `src/pages/WritePage.test.tsx`
- Create/Test: `src/pages/AskHerPage.test.tsx`

- [ ] **Step 1: Write failing tests for the new entry semantics**

Add tests asserting:

```tsx
expect(screen.getByText("我来写")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /写好并请她补全|保存并生成陪伴内容/ })).toBeInTheDocument();
expect(screen.queryByText("添加图片")).not.toBeInTheDocument();
```

And for `AskHerPage`:

```tsx
expect(screen.getByText("请她写")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "请她写" })).toBeInTheDocument();
expect(screen.queryByRole("textbox")).not.toHaveValue(expect.stringContaining("手动正文"));
```

Run:

```bash
npm test -- src/pages/WritePage.test.tsx src/pages/AskHerPage.test.tsx
```

Expected:

- tests fail because `AskHerPage` does not exist and `WritePage` still exposes mixed semantics

- [ ] **Step 2: Refactor `WritePage` into a true user-authored flow**

Update `src/pages/WritePage.tsx`:

```tsx
const draft = {
  id: `journal-${date}`,
  date,
  weekday,
  mood,
  source: "user" as const,
  content,
  voiceMessages,
  voiceStyle,
};
```

Remove the `ImageUploader` block from the main form. Update copy:

```tsx
<p className="section-label">我来写</p>
<h2>把今天记下来</h2>
<p className="hero-copy">你写正文，她来补全配图、语音和自拍。</p>
```

Update save button label to:

```tsx
const saveButtonLabel =
  saveState === "saving" ? "生成中..." :
  saveState === "error" ? "失败重试" :
  "写好并请她补全";
```

- [ ] **Step 3: Add `AskHerPage`**

Create `src/pages/AskHerPage.tsx` with a lightweight form:

```tsx
type AskHerPageProps = {
  onSave: (journal: Journal) => void | Promise<void>;
  onCancel: () => void;
  voiceStyle?: "soft" | "warm" | "playful";
};
```

The page should collect:

- date
- mood
- optional scene hint

On submit, call content generation and build:

```ts
{
  id: `journal-${date}`,
  date,
  weekday,
  mood,
  source: "girlfriend",
  content: generatedContent,
  voiceMessages: generatedVoiceMessages,
  voiceStyle,
}
```

- [ ] **Step 4: Keep generation APIs unified across both flows**

Update `src/services/journalGeneration.ts` and `src/services/api/contentClient.ts` to accept:

```ts
type ContentGenerationInput = {
  mood: Mood;
  date: string;
  recalledMemory?: string;
  voiceStyle?: "soft" | "warm" | "playful";
  sceneHint?: string;
}
```

Only `AskHerPage` should pass `sceneHint`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/pages/WritePage.test.tsx src/pages/AskHerPage.test.tsx src/services/journalGeneration.test.ts
```

Expected:

- both entry pages behave with clear split semantics

- [ ] **Step 6: Commit**

```bash
git add src/pages/WritePage.tsx src/pages/AskHerPage.tsx src/services/journalGeneration.ts src/services/api/contentClient.ts src/pages/WritePage.test.tsx src/pages/AskHerPage.test.tsx
git commit -m "feat: split user-authored and girlfriend-authored journal flows"
```

---

## Task 3: Move Voice Back Into Each Journal Entry

**Files:**
- Create: `src/components/InlineVoiceBar.tsx`
- Create/Test: `src/components/InlineVoiceBar.test.tsx`
- Modify: `src/components/JournalCard.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/VoicePage.tsx`
- Modify: `src/components/VoicePlayer.tsx` (only if reusable state helps)
- Test: `src/components/JournalCard.test.tsx`

- [ ] **Step 1: Write failing tests for inline voice behavior**

Add expectations to journal-card tests:

```tsx
expect(screen.getByLabelText("日记语音栏")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "早安" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "午后" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "晚安" })).toBeInTheDocument();
```

Run:

```bash
npm test -- src/components/JournalCard.test.tsx src/pages/VoicePage.test.tsx
```

Expected:

- tests fail because voice is still only a preview fragment or separate page

- [ ] **Step 2: Build `InlineVoiceBar`**

Create `src/components/InlineVoiceBar.tsx`:

```tsx
type InlineVoiceBarProps = {
  voiceMessages: VoiceMessage[];
};
```

Behavior:

- default to first voice message
- segmented controls or small pills for `早安 / 午后 / 晚安`
- inline audio player with current transcript preview

Minimal render shape:

```tsx
<section className="inline-voice-bar" aria-label="日记语音栏">
  <div className="inline-voice-tabs">...</div>
  <VoicePlayer voiceMessage={activeVoice} />
</section>
```

- [ ] **Step 3: Embed the voice bar into each journal entry**

Update `src/components/JournalCard.tsx` to replace the current single preview row:

```tsx
{journal.voiceMessages.length > 0 ? (
  <InlineVoiceBar voiceMessages={journal.voiceMessages} />
) : null}
```

Also add a source label:

```tsx
<span className="journal-source-chip">
  {journal.source === "user" ? "我写的" : "她写的"}
</span>
```

- [ ] **Step 4: Downgrade `VoicePage`**

Update `src/pages/VoicePage.tsx` to either:

- render an archive-only fallback message, or
- keep it as a non-primary archive view without assuming it is navigable from the header

Minimal acceptable text:

```tsx
<EmptyState
  title="语音已经回到日记里"
  description="现在每篇日记下方都可以直接切换和播放语音留言。这里后续可作为语音归档页。"
/>
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/components/InlineVoiceBar.test.tsx src/components/JournalCard.test.tsx src/pages/VoicePage.test.tsx src/components/VoicePlayer.test.tsx
```

Expected:

- inline voice switching works
- primary journal reading no longer depends on voice page

- [ ] **Step 6: Commit**

```bash
git add src/components/InlineVoiceBar.tsx src/components/InlineVoiceBar.test.tsx src/components/JournalCard.tsx src/pages/VoicePage.tsx src/components/JournalCard.test.tsx
git commit -m "feat: embed voice playback inside each journal entry"
```

---

## Task 4: Shift Media Toward Realistic Images and Stable Selfie Roles

**Files:**
- Modify: `src/services/minimax.ts`
- Modify: `src/pages/WritePage.tsx`
- Modify: `src/pages/AskHerPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/services/minimax.test.ts`

- [ ] **Step 1: Write failing tests for media prompt direction**

Add expectations around prompt generation:

```ts
expect(prompt).toContain("写实");
expect(prompt).toContain("生活化");
expect(prompt).not.toContain("Japanese notebook style");
```

Run:

```bash
npm test -- src/services/minimax.test.ts
```

Expected:

- tests fail because current image prompt still leans stylized/cozy illustration

- [ ] **Step 2: Update journal image prompt to realistic photography**

Modify `buildJournalImagePrompt` in `src/services/minimax.ts`:

```ts
return [
  "写实生活摄影风格。",
  "像手机或轻写真记录下来的真实日常场景。",
  `Mood: ${journal.mood}.`,
  `Date: ${journal.date} ${journal.weekday}.`,
  `Scene inspiration: ${journal.content.slice(0, 180)}`,
  "No text overlays. Natural lighting. Human, believable, intimate daily life.",
].join(" ");
```

- [ ] **Step 3: Tighten selfie persona prompts**

Update girlfriend selfie prompts to encode:

```ts
const GIRLFRIEND_DESCRIPTION = `
阳光、爱自拍、身材很好、生活感强的年轻女孩。
自然真实的手机自拍感，亲近、明亮、愿意主动和你分享日常。
`.trim();
```

Ensure the default selfie path remains “daytime / normal share”, not sleepwear.

- [ ] **Step 4: Remove user-uploaded images from the user-authored primary flow**

If any `ImageUploader` remnants remain in `WritePage`, remove them from the main form and tests.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/services/minimax.test.ts src/pages/WritePage.test.tsx src/pages/AskHerPage.test.tsx
```

Expected:

- realistic prompt expectations pass
- user-authored flow no longer implies “upload image yourself”

- [ ] **Step 6: Commit**

```bash
git add src/services/minimax.ts src/pages/WritePage.tsx src/pages/AskHerPage.tsx src/services/minimax.test.ts
git commit -m "feat: switch journal media toward realistic photo-style content"
```

---

## Task 5: Add Persisted Night Bonus Selfie

**Files:**
- Create: `src/services/nightBonusSelfie.ts`
- Create/Test: `src/services/nightBonusSelfie.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/services/memory.ts`
- Modify: `src/components/JournalCard.tsx`

- [ ] **Step 1: Write failing tests for night bonus behavior**

Create tests for:

```ts
expect(shouldGenerateNightBonus({ hour: 22, hasNightBonusSelfie: false })).toBe(true);
expect(shouldGenerateNightBonus({ hour: 22, hasNightBonusSelfie: true })).toBe(false);
expect(shouldGenerateNightBonus({ hour: 15, hasNightBonusSelfie: false })).toBe(false);
```

And journal-card rendering:

```tsx
expect(screen.getByText("夜间加餐")).toBeInTheDocument();
expect(screen.getByAltText("夜间自拍")).toBeInTheDocument();
```

Run:

```bash
npm test -- src/services/nightBonusSelfie.test.ts src/components/JournalCard.test.tsx
```

Expected:

- tests fail because the helper and UI section do not exist

- [ ] **Step 2: Add the decision helper**

Create `src/services/nightBonusSelfie.ts`:

```ts
export function shouldGenerateNightBonus({
  hour,
  hasNightBonusSelfie,
}: {
  hour: number;
  hasNightBonusSelfie: boolean;
}) {
  return hour >= 21 && !hasNightBonusSelfie;
}
```

Add a prompt helper for sleepwear selfie generation in the same file or `minimax.ts`:

```ts
export function buildNightBonusPrompt(mood: Mood) {
  return `睡衣自拍，甜心感，更像晚上专门拍给你的照片。心情：${mood}`;
}
```

- [ ] **Step 3: Trigger and persist night bonus selfie**

Update `src/App.tsx` selected-journal flow:

```tsx
useEffect(() => {
  const selected = journals.find((j) => j.id === selectedJournalId);
  if (!selected) return;

  const hour = new Date().getHours();
  if (!shouldGenerateNightBonus({ hour, hasNightBonusSelfie: Boolean(selected.nightBonusSelfie) })) return;

  generateNightBonusSelfie(selected).then((url) => {
    setJournals((current) =>
      current.map((item) => item.id === selected.id ? { ...item, nightBonusSelfie: url } : item)
    );
  });
}, [journals, selectedJournalId]);
```

The helper used above can live in `minimax.ts` or `nightBonusSelfie.ts`, but it must save the generated URL to the journal object so it is persisted by the existing `saveJournals` effect.

- [ ] **Step 4: Render the night bonus block**

Update `src/components/JournalCard.tsx`:

```tsx
{journal.nightBonusSelfie ? (
  <div className="night-bonus-strip" aria-label="夜间加餐">
    <p className="selfie-label">夜间加餐</p>
    <img src={journal.nightBonusSelfie} alt="夜间自拍" />
  </div>
) : null}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/services/nightBonusSelfie.test.ts src/components/JournalCard.test.tsx src/services/memoryRebuild.test.ts
```

Expected:

- night bonus generates only once per journal
- persisted journals preserve the extra selfie field

- [ ] **Step 6: Commit**

```bash
git add src/services/nightBonusSelfie.ts src/services/nightBonusSelfie.test.ts src/App.tsx src/components/JournalCard.tsx src/services/memory.ts
git commit -m "feat: add persisted night bonus selfie behavior"
```

---

## Task 6: Final Integration and Regression Pass

**Files:**
- Modify as needed from previous tasks
- Test: all touched page/component/service test files

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npm test -- \
  src/pages/WritePage.test.tsx \
  src/pages/AskHerPage.test.tsx \
  src/components/JournalCard.test.tsx \
  src/components/InlineVoiceBar.test.tsx \
  src/components/VoicePlayer.test.tsx \
  src/services/journalGeneration.test.ts \
  src/services/minimax.test.ts \
  src/services/nightBonusSelfie.test.ts \
  src/services/memoryRebuild.test.ts \
  src/services/reminders.test.ts
```

Expected:

- all tests pass

- [ ] **Step 2: Run the app manually**

Run:

```bash
npm run dev
```

Manual checks:

- homepage shows `我来写` and `请她写`
- header no longer promotes `语音`
- `我来写` keeps editable content
- `请她写` is lightweight and generation-led
- journal cards show source labels
- journal cards contain inline voice switching
- realistic image generation path still works
- night bonus selfie appears only once during night-open flow

- [ ] **Step 3: Commit final integration polish**

```bash
git add src
git commit -m "feat: restructure journals around dual entry and inline companion media"
```

---

## Spec Coverage Check

This plan covers the approved spec requirements:

- dual entry (`我来写` / `请她写`)
- unified journal-entry display
- voice moved back into each entry
- realistic imagery direction
- stable selfie role separation
- night-open sleepwear selfie bonus

Out of scope for this plan:

- cloud sync
- multi-role orchestration
- cross-platform reuse beyond preserving data-shape cleanliness

---

## Execution Notes

- Do not reintroduce manual image upload into `我来写`.
- Do not keep `VoicePage` in the primary tab structure.
- Do not generate night bonus selfie repeatedly for the same journal.
- Keep all divergence at entry flows; the display layer must stay unified.
