# Home Nav + Photo Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant top-level actions, delete the standalone voice page, add a new photo wall page, and tighten image-generation prompts toward full-body vertical shots with stronger nightwear styling.

**Architecture:** Keep the existing single-page app structure and journal persistence model intact. Implement photo wall as a front-end derived view from existing `Journal` media fields, remove `VoicePage` from page routing, and refine prompt construction in `minimax.ts` plus `nightBonusSelfie.ts` without changing backend contracts.

**Tech Stack:** React 18, Vite, TypeScript, Vitest, Testing Library, existing front-end journal model and media generation services

---

### Task 1: Simplify Top-Level Navigation

**Files:**
- Modify: `src/types/journal.ts`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Header.test.tsx`

- [ ] **Step 1: Update the app page union to replace `voice` with `photo-wall`**

Change `src/types/journal.ts`:

```ts
export type AppPage = "home" | "write" | "ask-her" | "photo-wall" | "settings";
```

- [ ] **Step 2: Update the header tabs to remove `语音页` and add `照片墙`**

Change `src/components/Header.tsx`:

```ts
const tabs: { id: AppPage; label: string }[] = [
  { id: "home", label: "首页" },
  { id: "write", label: "我来写" },
  { id: "ask-her", label: "请她写" },
  { id: "photo-wall", label: "照片墙" },
  { id: "settings", label: "设置" },
];
```

- [ ] **Step 3: Replace the old header test with one that asserts `照片墙` exists and `语音页` does not**

Change `src/components/Header.test.tsx`:

```ts
it("renders photo wall entry and hides the old voice page entry", () => {
  render(<Header activePage="home" onNavigate={() => {}} />);

  expect(screen.getByRole("button", { name: "照片墙" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "语音页" })).toBeNull();
});
```

- [ ] **Step 4: Run the header test**

Run:

```bash
npx vitest run src/components/Header.test.tsx
```

Expected: header test passes with the new nav structure.

---

### Task 2: Remove The Standalone Voice Page And Home Duplicates

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/HomePage.tsx`
- Delete or stop referencing: `src/pages/VoicePage.tsx`
- Delete or retire: `src/pages/VoicePage.test.tsx`
- Delete or retire: `src/pages/VoicePage.journalNav.test.tsx`

- [ ] **Step 1: Remove `VoicePage` from app imports and page rendering**

In `src/App.tsx`, remove:

```ts
import { VoicePage } from "./pages/VoicePage";
```

And replace the page switch branch with a new `photo-wall` branch later in Task 3. There should be no `"voice"` case left.

- [ ] **Step 2: Remove the duplicate `我来写 / 请她写` buttons from the home hero**

Change `src/pages/HomePage.tsx` so `hero-actions` keeps only view mode controls:

```tsx
<div className="hero-actions">
  <button
    type="button"
    className={viewMode === "timeline" ? "toggle-button is-active" : "toggle-button"}
    onClick={() => setViewMode("timeline")}
  >
    卡片流
  </button>
  <button
    type="button"
    className={viewMode === "calendar" ? "toggle-button is-active" : "toggle-button"}
    onClick={() => setViewMode("calendar")}
  >
    月历
  </button>
</div>
```

- [ ] **Step 3: Keep the floating `＋` button as the single homepage write shortcut**

Do not remove:

```tsx
<button type="button" className="floating-button" onClick={onCreateNew}>
  ＋
</button>
```

This preserves a quick-entry action without duplicating the top nav buttons.

- [ ] **Step 4: Remove the standalone voice page tests once the route is gone**

Delete or stop including:

```text
src/pages/VoicePage.test.tsx
src/pages/VoicePage.journalNav.test.tsx
```

If the repo prefers keeping deleted-file diffs explicit, remove both files entirely instead of leaving broken coverage behind.

- [ ] **Step 5: Run focused tests for app navigation surfaces**

Run:

```bash
npx vitest run src/components/Header.test.tsx
```

Expected: no failures related to removed `语音页`.

---

### Task 3: Add The Photo Wall Page

**Files:**
- Create: `src/services/photoWall.ts`
- Create: `src/pages/PhotoWallPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`
- Optional test: `src/services/photoWall.test.ts`

- [ ] **Step 1: Create a derived photo wall item model**

Create `src/services/photoWall.ts`:

```ts
import type { Journal, Mood } from "../types/journal";

export type PhotoWallItem = {
  id: string;
  journalId: string;
  date: string;
  mood: Mood;
  kind: "image" | "selfie" | "nightBonus";
  src: string;
};

export function buildPhotoWallItems(journals: Journal[]): PhotoWallItem[] {
  return journals.flatMap((journal) => {
    const imageItems = (journal.images ?? []).map((src, index) => ({
      id: `${journal.id}-image-${index}`,
      journalId: journal.id,
      date: journal.date,
      mood: journal.mood,
      kind: "image" as const,
      src,
    }));

    const selfieItems = (journal.selfies ?? []).map((src, index) => ({
      id: `${journal.id}-selfie-${index}`,
      journalId: journal.id,
      date: journal.date,
      mood: journal.mood,
      kind: "selfie" as const,
      src,
    }));

    const nightBonusItems = journal.nightBonusSelfie
      ? [{
          id: `${journal.id}-night-bonus`,
          journalId: journal.id,
          date: journal.date,
          mood: journal.mood,
          kind: "nightBonus" as const,
          src: journal.nightBonusSelfie,
        }]
      : [];

    return [...imageItems, ...selfieItems, ...nightBonusItems];
  });
}
```

- [ ] **Step 2: Add the new page component**

Create `src/pages/PhotoWallPage.tsx`:

```tsx
import { useMemo, useState } from "react";
import type { Journal } from "../types/journal";
import { EmptyState } from "../components/EmptyState";
import { buildPhotoWallItems } from "../services/photoWall";

type PhotoWallPageProps = {
  journals: Journal[];
};

export function PhotoWallPage({ journals }: PhotoWallPageProps) {
  const items = useMemo(() => buildPhotoWallItems(journals), [journals]);
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);

  if (items.length === 0) {
    return <EmptyState title="照片墙还是空的" description="等生成更多照片后，这里会慢慢贴满回忆。" />;
  }

  return (
    <section className="page-stack">
      <div className="page-hero card">
        <div>
          <p className="section-label">照片墙</p>
          <h2>冲洗过的回忆</h2>
          <p className="hero-copy">把所有日记里留下来的照片，都贴进这一面墙。</p>
        </div>
      </div>

      <div className="photo-wall-grid" aria-label="照片墙">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="photo-polaroid"
            style={{ transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)` }}
            onClick={() => setSelectedSrc(item.src)}
          >
            <img src={item.src} alt={`${item.date}-${item.kind}`} />
            <span>{item.date}</span>
          </button>
        ))}
      </div>

      {selectedSrc && (
        <div className="image-gallery-overlay" onClick={() => setSelectedSrc(null)} role="dialog" aria-modal="true">
          <img src={selectedSrc} alt="照片墙预览" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Wire the page into `App.tsx`**

In `src/App.tsx`, add:

```ts
import { PhotoWallPage } from "./pages/PhotoWallPage";
```

And render it in the main page switch:

```tsx
{activePage === "photo-wall" ? (
  <PhotoWallPage journals={journals} />
) : ...}
```

- [ ] **Step 4: Add photo wall and polaroid styles**

Append focused styles to `src/styles/global.css`:

```css
.photo-wall-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

.photo-polaroid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 18px;
  background: #fffdf8;
  border: 1px solid rgba(126, 104, 86, 0.12);
  border-radius: 8px;
  box-shadow: 0 16px 30px rgba(92, 74, 56, 0.12);
  filter: sepia(0.12) saturate(0.9) contrast(0.96);
}

.photo-polaroid img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 4px;
}

.photo-polaroid span {
  color: var(--muted);
  font-size: 0.85rem;
  text-align: left;
}
```

- [ ] **Step 5: Add a focused data-derivation test**

Create `src/services/photoWall.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPhotoWallItems } from "./photoWall";

describe("buildPhotoWallItems", () => {
  it("collects images, selfies, and night bonus photos from journals", () => {
    const items = buildPhotoWallItems([
      {
        id: "j1",
        date: "2026-05-20",
        weekday: "周三",
        mood: "开心",
        source: "girlfriend",
        content: "test",
        voiceMessages: [],
        images: ["img-1"],
        selfies: ["selfie-1"],
        nightBonusSelfie: "night-1",
      },
    ]);

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.kind)).toEqual(["image", "selfie", "nightBonus"]);
  });
});
```

- [ ] **Step 6: Run the new photo wall test**

Run:

```bash
npx vitest run src/services/photoWall.test.ts
```

Expected: derived media aggregation works with no backend changes.

---

### Task 4: Fix Duplicate Voice Keys In Journal Cards

**Files:**
- Modify: `src/components/JournalCard.tsx`
- Optional check: `src/components/InlineVoiceBar.test.tsx`

- [ ] **Step 1: Pass a stable unique key prefix into the inline voice bar**

Update `src/components/JournalCard.tsx`:

```tsx
{journal.voiceMessages.length > 0 ? (
  <InlineVoiceBar voiceMessages={journal.voiceMessages} keyPrefix={journal.id} />
) : null}
```

- [ ] **Step 2: Extend the inline voice bar API to use the prefix in child keys**

Update `src/components/InlineVoiceBar.tsx` to accept:

```ts
type InlineVoiceBarProps = {
  voiceMessages: VoiceMessage[];
  keyPrefix?: string;
};
```

And render keys like:

```tsx
key={`${keyPrefix ?? "voice"}-${message.id}-${message.timing}`}
```

This prevents duplicate `voice-morning` / `voice-afternoon` / `voice-night` collisions across different journals on the home list.

- [ ] **Step 3: Run the inline voice bar tests**

Run:

```bash
npx vitest run src/components/InlineVoiceBar.test.tsx src/components/JournalCard.test.tsx
```

Expected: no rendering regressions and no duplicate-key warnings during manual browser check.

---

### Task 5: Tighten Image And Night Prompt Strategy

**Files:**
- Modify: `src/services/minimax.ts`
- Modify: `src/services/nightBonusSelfie.ts`
- Modify: `src/services/minimax.test.ts`
- Modify: `src/services/nightBonusSelfie.test.ts`

- [ ] **Step 1: Strengthen the main journal image prompt toward full-body vertical composition**

In `src/services/minimax.ts`, extend `buildJournalImagePrompt(...)` with explicit composition lines:

```ts
"Vertical portrait composition.",
"Full-body framing preferred, subject fully visible in frame.",
"Show the complete outfit whenever possible.",
"Use lifestyle photography composition instead of face close-up.",
"Prefer standing, walking, seated full-body, or natural candid poses.",
```

Also ensure image generation calls prefer vertical output where practical. For example, the `generateMinimaxImages(..., { n: 2 })` branch should pass a portrait ratio:

```ts
generateMinimaxImages(buildJournalImagePrompt(journal, { sceneHint }), { n: 2, aspectRatio: "9:16" })
```

- [ ] **Step 2: Strengthen the night bonus prompt toward soft sexy sleepwear without crossing into explicit content**

In `src/services/nightBonusSelfie.ts`, replace the current single-line prompt with:

```ts
export function buildNightBonusPrompt(mood: Mood): string {
  return `夜晚室内全身竖屏自拍，睡衣或柔软居家睡裙，慵懒、亲密、轻性感、晚安氛围，暖色床头灯，真实生活感，轻裸露，适当暴露。黑色丝性感但不打擦边的黑丝睡裙，轻微挑逗心情：${mood}`;
}
```

- [ ] **Step 3: Update prompt tests to assert the new composition and nightwear language**

Add assertions in `src/services/minimax.test.ts`:

```ts
expect(prompt).toContain("Vertical portrait composition.");
expect(prompt).toContain("Full-body framing preferred");
expect(prompt).toContain("Show the complete outfit");
```

Update `src/services/nightBonusSelfie.test.ts`:

```ts
expect(prompt).toContain("全身竖屏自拍");
expect(prompt).toContain("睡衣");
expect(prompt).toContain("不裸露");
```

- [ ] **Step 4: Run the focused media prompt tests**

Run:

```bash
npx vitest run src/services/minimax.test.ts src/services/nightBonusSelfie.test.ts
```

Expected: prompt-shaping tests pass and encode the new generation direction.

---

### Task 6: Final App Wiring Verification

**Files:**
- Verify: `src/App.tsx`
- Verify: `src/pages/HomePage.tsx`
- Verify: `src/pages/PhotoWallPage.tsx`
- Verify: `src/components/Header.tsx`

- [ ] **Step 1: Run the focused front-end test set**

Run:

```bash
npx vitest run src/components/Header.test.tsx src/components/InlineVoiceBar.test.tsx src/components/JournalCard.test.tsx src/services/photoWall.test.ts src/services/minimax.test.ts src/services/nightBonusSelfie.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 2: Run a production build**

Run:

```bash
npm run build
```

Expected: Vite build completes successfully with the new `photo-wall` route and no lingering `VoicePage` references.

- [ ] **Step 3: Manual browser verification**

Run:

```bash
npm run dev
```

Then verify manually:

- Header shows `首页 / 我来写 / 请她写 / 照片墙 / 设置`
- Header does not show `语音页`
- Homepage hero no longer repeats `我来写 / 请她写`
- Photo wall opens and displays all historical generated images
- Photo wall cards look like warm polaroids
- No duplicate-key warnings appear for voice bars
- New images trend toward portrait full-body framing
- Night bonus images trend toward pajama / evening-room styling

---

## Self-Review

### Spec coverage

- Navigation de-duplication covered by Tasks 1 and 2
- Voice page removal covered by Task 2
- Photo wall addition covered by Task 3
- Duplicate key cleanup covered by Task 4
- Nightwear and full-body image prompt updates covered by Task 5

### Placeholder scan

- No `TODO` or `TBD` placeholders remain
- All modified and created files are named explicitly
- Validation commands are included for each task group

### Scope check

- This plan stays inside the current web app
- No backend schema or API changes are required
- Mobile app work is intentionally excluded
