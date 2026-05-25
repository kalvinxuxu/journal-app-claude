# Diary Wall Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the diary wall by removing residual fork pages, unifying rendering with a lightweight adapter layer, and stripping voice display remnants.

**Architecture:** Three-step approach: (1) delete orphan pages/routes, (2) build lightweight `DiaryWallRenderableItem` adapter + `WallItemRenderer` pattern, (3) strip voice transcript and old generation status display from diary wall.

**Tech Stack:** React 18, TypeScript, Vitest

---

## File Structure

```
src/
  components/diaryWall/
    JournalWallItem.tsx    # Create — renders today's journal as a wall item
    OotdWallItem.tsx       # Create — renders OOTD as a wall item
    GreetingWallItem.tsx   # Create — renders greeting as a wall item
  pages/
    DiaryWallPage.tsx      # Modify — replace three-section rendering with items.map(WallItemRenderer)
  components/Header.tsx    # Modify — remove "今日问候" tab
  types/journal.ts         # Modify — remove "greetings" from AppPage
  pages/AskHerPage.tsx     # Delete
  pages/AskHerPage.test.tsx # Delete
  pages/GreetingPage.tsx   # Delete
```

---

## Task 1: Delete Orphan Pages and Routes

**Files:**
- Delete: `src/pages/AskHerPage.tsx`
- Delete: `src/pages/AskHerPage.test.tsx`
- Delete: `src/pages/GreetingPage.tsx`
- Modify: `src/components/Header.tsx:5` — remove `{ id: "greetings", label: "今日问候" }` from navTabs
- Modify: `src/types/journal.ts:39` — remove `"greetings"` from `AppPage` union

- [ ] **Step 1: Delete AskHerPage.tsx and AskHerPage.test.tsx**

```bash
rm src/pages/AskHerPage.tsx
rm src/pages/AskHerPage.test.tsx
```

- [ ] **Step 2: Delete GreetingPage.tsx**

```bash
rm src/pages/GreetingPage.tsx
```

- [ ] **Step 3: Read Header.tsx to find the navTabs array**

Find the line containing `{ id: "greetings", label: "今日问候" }` and remove it.

- [ ] **Step 4: Update AppPage type in types/journal.ts**

Remove `"greetings"` from the `AppPage` union so it reads:
```ts
export type AppPage = "home" | "diary-wall" | "photo-wall" | "settings";
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: remove orphan AskHerPage and GreetingPage routes"
```

---

## Task 2: Strip Voice Display and Old Generation Status from DiaryWallPage

**Files:**
- Modify: `src/pages/DiaryWallPage.tsx:286-293` (voice transcript rendering)
- Modify: `src/pages/DiaryWallPage.tsx:296` (CompanionHintLine)
- Modify: `src/pages/DiaryWallPage.tsx:297-311` (CompanionFeedbackBar)
- Modify: `src/pages/DiaryWallPage.tsx:337-358` (genErrors + errorMessage status regions)

- [ ] **Step 1: Read the current DiaryWallPage.tsx to understand exact lines**

- [ ] **Step 2: Remove voice transcript rendering block**

Remove (or comment out) lines 286-293:
```tsx
// DELETE THIS BLOCK:
{displayedJournal.voiceMessages.length > 0 && (
  <div style={{ marginTop: "16px" }}>
    {displayedJournal.voiceMessages.map((vm) => (
      <div key={vm.id} style={{ fontSize: "13px", color: "#424242" }}>
        <span style={{ fontWeight: 500 }}>{getTimingLabel(vm.timing)}</span>: {vm.transcript}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Remove CompanionHintLine**

Delete: `<CompanionHintLine text="你刚刚提到的那段心事，会让她更懂你一点。" />`

Also remove the import at the top of the file for `CompanionHintLine`.

- [ ] **Step 4: Remove CompanionFeedbackBar**

Delete the entire `<CompanionFeedbackBar ... />` block (lines 297-311).
Also remove the import for `CompanionFeedbackBar`.

- [ ] **Step 5: Remove old generation status regions**

Delete the `genErrors` rendering block (lines 337-351) and the `errorMessage` block (lines 353-358):
```tsx
// DELETE: {genErrors && phase === "error" ? (...) : null}
// DELETE: {errorMessage ? (...) : null}
```

Also remove `genErrors` state declaration and related `setGenErrors` calls from the component body. Keep `errorMessage` since it's still used in the catch block of handleRefresh.

- [ ] **Step 6: Remove unused imports**

After removing `CompanionHintLine`, `CompanionFeedbackBar`, and `VoicePlayer` references, clean up any unused imports from the file top.

- [ ] **Step 7: Run tests**

```bash
npx vitest run src/pages/DiaryWallPage.test.tsx
```

Expected: All 15 tests still pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/DiaryWallPage.tsx && git commit -m "feat: strip voice display and old gen-status from diary wall"
```

---

## Task 3: Create DiaryWall Sub-Renderer Components

**Files:**
- Create: `src/components/diaryWall/JournalWallItem.tsx`
- Create: `src/components/diaryWall/OotdWallItem.tsx`
- Create: `src/components/diaryWall/GreetingWallItem.tsx`
- Modify: `src/pages/DiaryWallPage.tsx` — refactor to use WallItemRenderer

- [ ] **Step 1: Create `src/components/diaryWall/` directory**

```bash
mkdir -p src/components/diaryWall
```

- [ ] **Step 2: Create JournalWallItem.tsx**

```tsx
import type { Journal } from "../../types/journal";

export type JournalWallItemProps = {
  journal: Journal;
  onRefresh: () => void;
  isLoading: boolean;
};

export function JournalWallItem({ journal, onRefresh, isLoading }: JournalWallItemProps) {
  return (
    <div className="detail-card card">
      <div className="detail-card__top">
        <div>
          <p className="section-label">今日日记</p>
          <h3>她记录了这一天</h3>
        </div>
        <button
          type="button"
          className="toggle-button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? "记录中..." : "重新记录今天"}
        </button>
      </div>

      <p>{journal.content}</p>

      {journal.images && journal.images.length > 0 && (
        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {journal.images.map((img, i) => (
            <img key={i} src={img} alt={`Generated ${i + 1}`} style={{ width: "100%", borderRadius: "8px" }} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create OotdWallItem.tsx**

```tsx
import type { OotdItem } from "../../services/api/companionClient";

export type OotdWallItemProps = {
  ootd: OotdItem | null;
  loading?: boolean;
  error?: string;
  onRefresh: () => void;
};

export function OotdWallItem({ ootd, loading, error, onRefresh }: OotdWallItemProps) {
  if (loading) {
    return (
      <div className="detail-card card">
        <p className="section-label">今日OOTD</p>
        <p style={{ color: "#757575", fontSize: "13px" }}>loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-card card">
        <p className="section-label">今日OOTD</p>
        <p style={{ color: "#C62828", fontSize: "13px" }}>{error}</p>
        <button type="button" className="toggle-button" onClick={onRefresh}>重试</button>
      </div>
    );
  }

  if (!ootd) return null;

  return (
    <div className="detail-card card">
      <div className="detail-card__top">
        <div>
          <p className="section-label">今日OOTD</p>
          <h3>她今天想穿这套</h3>
        </div>
        <button type="button" className="toggle-button" onClick={onRefresh}>换一套</button>
      </div>
      {ootd.imageUrl ? (
        <div style={{ marginTop: "12px" }}>
          <img src={ootd.imageUrl} alt="今日OOTD" style={{ width: "100%", maxWidth: "240px", borderRadius: "8px" }} />
        </div>
      ) : (
        <div style={{ width: "100%", height: "160px", background: "#F3E5F5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "12px" }}>
          <span style={{ color: "#6A1B9A", fontSize: "13px" }}>这是她今天想穿的</span>
        </div>
      )}
      {ootd.caption && (
        <p style={{ fontSize: "12px", color: "#757575", marginTop: "8px" }}>{ootd.caption}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create GreetingWallItem.tsx**

```tsx
import { GreetingCard } from "../companion/GreetingCard";
import { GreetingRevealView } from "../companion/GreetingRevealView";
import type { GreetingCard as GreetingCardType } from "../../services/greetingStore";

export type GreetingWallItemProps = {
  greeting: GreetingCardType | null;
  pending: boolean;
  onRevealComplete: (id: string) => void;
};

export function GreetingWallItem({ greeting, pending, onRevealComplete }: GreetingWallItemProps) {
  if (pending && greeting) {
    return (
      <GreetingRevealView
        greeting={greeting}
        onComplete={() => onRevealComplete(greeting.id)}
      />
    );
  }
  return <GreetingCard onOpen={undefined} />;
}
```

- [ ] **Step 5: Create WallItemRenderer.tsx (the unified entry)**

```tsx
import type { DiaryWallRenderableItem } from "../../types/diaryWall";
import { JournalWallItem } from "./JournalWallItem";
import { OotdWallItem } from "./OotdWallItem";
import { GreetingWallItem } from "./GreetingWallItem";

export type WallItemRendererProps = {
  item: DiaryWallRenderableItem;
  onJournalRefresh: () => void;
  onOotdRefresh: () => void;
  onGreetingRevealComplete: (id: string) => void;
  isLoading: boolean;
};

export function WallItemRenderer({ item, onJournalRefresh, onOotdRefresh, onGreetingRevealComplete, isLoading }: WallItemRendererProps) {
  switch (item.kind) {
    case "journal":
      return (
        <JournalWallItem
          journal={item.journal}
          onRefresh={onJournalRefresh}
          isLoading={isLoading}
        />
      );
    case "ootd":
      return (
        <OotdWallItem
          ootd={item.ootd}
          loading={item.loading}
          error={item.error}
          onRefresh={onOotdRefresh}
        />
      );
    case "greeting":
      return (
        <GreetingWallItem
          greeting={item.greeting}
          pending={item.pending}
          onRevealComplete={onGreetingRevealComplete}
        />
      );
  }
}
```

- [ ] **Step 6: Create `src/types/diaryWall.ts`**

```ts
import type { Journal } from "./journal";
import type { OotdItem } from "../services/api/companionClient";
import type { GreetingCard } from "../services/greetingStore";

export type DiaryWallRenderableItem =
  | { kind: "journal"; date: string; journal: Journal }
  | { kind: "ootd"; date: string; ootd: OotdItem | null; loading?: boolean; error?: string }
  | { kind: "greeting"; date: string; greeting: GreetingCard | null; pending?: boolean };
```

- [ ] **Step 7: Refactor DiaryWallPage to use items.map(WallItemRenderer)**

Read the current DiaryWallPage. Replace the three-section rendering (journal/OOTD/greeting) with:

1. Add `DiaryWallRenderableItem` type import
2. Build `items` array in a `useMemo`:
```tsx
const items = useMemo<DiaryWallRenderableItem[]>(() => [
  { kind: "journal", date: today, journal: displayedJournal },
  { kind: "ootd", date: today, ootd, loading: ootdLoading, error: ootdError ?? undefined },
  { kind: "greeting", date: today, greeting: null, pending: !!pendingGreeting },
], [today, displayedJournal, ootd, ootdLoading, ootdError, pendingGreeting]);
```

3. Replace the three hardcoded wall sections with:
```tsx
{items.map((item) => (
  <WallItemRenderer
    key={item.kind}
    item={item}
    onJournalRefresh={handleRefresh}
    onOotdRefresh={handleOotdRefresh}
    onGreetingRevealComplete={handleGreetingRevealComplete}
    isLoading={isLoading}
  />
))}
```

4. Remove the separate mood/scene hint form section — it stays in DiaryWallPage (above the items map) since it controls the refresh params.

- [ ] **Step 8: Run tests**

```bash
npx vitest run src/pages/DiaryWallPage.test.tsx
```

Expected: All 15 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/diaryWall/ src/types/diaryWall.ts src/pages/DiaryWallPage.tsx && git commit -m "feat: refactor diary wall to use WallItemRenderer with unified adapter layer"
```

---

## Task 4: Final Verification

- [ ] **Step 1: Run full test suite for affected files**

```bash
npx vitest run src/pages/DiaryWallPage.test.tsx src/pages/HomePage.test.tsx src/components/Header.test.tsx src/services/greetingStore.test.ts
```

Expected: All tests pass.

- [ ] **Step 2: Verify no orphan page references remain**

```bash
grep -r "AskHerPage\|GreetingPage\|greetings.*route\|onGreetingOpen" src/
```

Expected: No matches (except in types/journal.ts AppPage definition which should already be removed).

- [ ] **Step 3: Verify voice display is stripped from DiaryWallPage**

```bash
grep -n "voiceMessage\|transcript\|CompanionHintLine\|CompanionFeedbackBar\|genErrors" src/pages/DiaryWallPage.tsx
```

Expected: `genErrors` may appear in state declaration (ok); no voice transcript rendering, no CompanionHintLine, no CompanionFeedbackBar.

- [ ] **Step 4: Commit final verification**

```bash
git add -A && git commit -m "chore: verify diary wall consolidation complete"
```

---

## Success Criteria

1. `AskHerPage.tsx`, `AskHerPage.test.tsx`, `GreetingPage.tsx` deleted
2. Header has no "今日问候" tab
3. `AppPage` type has no `"greetings"`
4. DiaryWallPage uses `items.map()` + `WallItemRenderer`
5. Voice transcript no longer rendered in diary wall
6. `CompanionHintLine` and `CompanionFeedbackBar` removed from diary wall
7. Old `genErrors` / `errorMessage` generation status regions removed
8. All tests pass