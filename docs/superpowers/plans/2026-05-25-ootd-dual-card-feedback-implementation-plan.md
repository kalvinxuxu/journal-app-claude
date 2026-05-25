# OOTD Dual-Card Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a more stable OOTD experience that generates two selfie-oriented cards per day and turns likes into accumulated feedback plus lightweight relationship progression.

**Architecture:** Extend the backend OOTD model from a single image record to a daily OOTD set with JSON-backed card items, then render those cards independently on the diary wall. Reuse the existing feedback endpoint for like actions and feed OOTD likes into the current relationship progression path with minimal schema and UI changes.

**Tech Stack:** React, TypeScript, Express, better-sqlite3, Vitest, Testing Library

---

## File Structure

- Modify: `backend/src/companion/types.ts`
  - Extend OOTD types to support a `cards` array and per-card metadata.
- Modify: `backend/src/companion/services/ootdService.ts`
  - Generate two constrained selfie prompts and return two card records.
- Modify: `backend/src/companion/store/ootdStore.ts`
  - Persist and read `cards` JSON while keeping one row per user/date.
- Modify: `backend/src/companion/routes/companionRoutes.ts`
  - Return/store the dual-card OOTD payload and add a like endpoint or feedback mapping hook.
- Modify: `backend/src/companion/services/relationshipProgressionService.ts`
  - Count OOTD likes as lightweight feedback.
- Modify: `backend/src/companion/routes/companionRoutes.test.ts`
  - Cover dual-card response shape, prompt content, and like flow.
- Modify: `backend/src/companion/services/ootdService.test.ts`
  - Cover selfie prompt rules and dual-card output.
- Modify: `backend/src/companion/store/ootdStore.test.ts`
  - Cover JSON persistence for dual cards.
- Modify: `src/services/api/companionClient.ts`
  - Update OOTD types and add like submission helper.
- Modify: `src/types/diaryWall.ts`
  - Allow multiple OOTD wall items or normalized OOTD card items.
- Modify: `src/pages/DiaryWallPage.tsx`
  - Normalize one OOTD set into two rendered cards and handle like actions.
- Modify: `src/components/diaryWall/OotdWallItem.tsx`
  - Render per-card UI with like interaction.
- Modify: `src/pages/DiaryWallPage.test.tsx`
  - Cover two-card rendering and like-triggered feedback.

### Task 1: Backend OOTD Model And Generator

**Files:**
- Modify: `backend/src/companion/types.ts`
- Modify: `backend/src/companion/services/ootdService.ts`
- Test: `backend/src/companion/services/ootdService.test.ts`

- [ ] **Step 1: Write the failing generator test for dual-card output**

```ts
it("returns full-body and makeup selfie cards with constrained prompt direction", async () => {
  const prompts: string[] = [];
  const generator = createOotdGenerator({
    port: 3001,
    generateImage: async ({ prompt }) => {
      prompts.push(prompt);
      return `https://example.com/${prompts.length}.jpg`;
    },
  });

  const result = await generator("user-1", "2026-05-25", "https://example.com/ref.jpg", "old_money");

  expect(result.cards).toHaveLength(2);
  expect(result.cards[0].kind).toBe("fullbody_selfie");
  expect(result.cards[1].kind).toBe("makeup_closeup");
  expect(prompts[0]).toContain("mirror selfie");
  expect(prompts[0]).toContain("cute, sexy, or elegant");
  expect(prompts[1]).toContain("makeup close-up selfie");
  expect(prompts[1]).toContain("same girl and same outfit continuity");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/companion/services/ootdService.test.ts`
Expected: FAIL because `cards` does not exist and prompts are still single-image fashion-photo prompts.

- [ ] **Step 3: Write minimal OOTD type and generator implementation**

```ts
export type OotdCardKind = "fullbody_selfie" | "makeup_closeup";

export type OotdCard = {
  id: string;
  kind: OotdCardKind;
  imageUrl: string | null;
  caption: string | null;
  poseTag?: "cute" | "sexy" | "elegant";
  liked?: boolean;
};

function buildFullBodySelfiePrompt(outfitPrompt: string, fashionAura?: string, poseTag?: string) {
  return [
    "Young East Asian woman with a warm approachable girlfriend vibe.",
    "Xiaohongshu fashion blogger styling reference, polished and trend-aware.",
    "Full-body mirror selfie or obvious phone-camera self-shot.",
    "Head-to-toe visible, complete outfit clearly shown, shoes and accessories included.",
    "Pose should read clearly as cute, sexy, or elegant.",
    poseTag ? `Preferred pose mood: ${poseTag}.` : "",
    "Only one young woman in the image.",
    outfitPrompt,
  ].filter(Boolean).join(" ");
}

function buildMakeupCloseupPrompt(outfitPrompt: string, fashionAura?: string) {
  return [
    "Young East Asian woman with a warm approachable girlfriend vibe.",
    "Makeup close-up selfie with polished Xiaohongshu beauty blogger composition.",
    "Same girl and same outfit continuity as today's full-body OOTD selfie.",
    "Focus on makeup, hair, earrings, necklace, neckline, and upper-body outfit detail.",
    "Only one young woman in the image.",
    outfitPrompt,
  ].filter(Boolean).join(" ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/companion/services/ootdService.test.ts`
Expected: PASS with two cards returned and prompt assertions satisfied.

- [ ] **Step 5: Commit**

```bash
git add backend/src/companion/types.ts backend/src/companion/services/ootdService.ts backend/src/companion/services/ootdService.test.ts
git commit -m "feat: generate dual-card ootd selfie prompts"
```

### Task 2: Backend Storage And Routes

**Files:**
- Modify: `backend/src/companion/store/ootdStore.ts`
- Modify: `backend/src/companion/store/ootdStore.test.ts`
- Modify: `backend/src/companion/routes/companionRoutes.ts`
- Modify: `backend/src/companion/routes/companionRoutes.test.ts`

- [ ] **Step 1: Write the failing store test for cards JSON**

```ts
it("persists dual ootd cards as json and restores them", () => {
  store.upsert({
    id: "ootd_1",
    userId: "user-1",
    date: "2026-05-25",
    title: "今日穿搭",
    rationale: null,
    styleTags: ["精致穿搭"],
    cards: [
      { id: "card_1", kind: "fullbody_selfie", imageUrl: "https://example.com/1.jpg", caption: "全身自拍" },
      { id: "card_2", kind: "makeup_closeup", imageUrl: "https://example.com/2.jpg", caption: "妆容自拍" },
    ],
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
  });

  expect(store.findByUserIdAndDate("user-1", "2026-05-25")?.cards).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/companion/store/ootdStore.test.ts`
Expected: FAIL because store schema only supports `imageUrl` and no `cards`.

- [ ] **Step 3: Implement minimal JSON-backed cards persistence and route response**

```ts
const upsertStmt = db.prepare(`
  INSERT INTO daily_ootd (
    id, user_id, date, image_url, title, caption, rationale, style_tags, cards_json, created_at, updated_at
  ) VALUES (
    @id, @userId, @date, @imageUrl, @title, @caption, @rationale, @styleTags, @cardsJson, @createdAt, @updatedAt
  )
  ON CONFLICT(user_id, date) DO UPDATE SET
    image_url = excluded.image_url,
    title = excluded.title,
    caption = excluded.caption,
    rationale = excluded.rationale,
    style_tags = excluded.style_tags,
    cards_json = excluded.cards_json,
    updated_at = excluded.updated_at
`);
```

```ts
const ootdRecord = {
  id: `ootd_${Date.now()}`,
  userId,
  date,
  imageUrl: result.cards[0]?.imageUrl ?? null,
  title: result.title,
  caption: result.cards[0]?.caption ?? result.caption,
  rationale: result.rationale,
  styleTags: result.styleTags,
  cards: result.cards,
  createdAt: nowIso,
  updatedAt: nowIso,
};
```

- [ ] **Step 4: Add the failing route test for liking one OOTD card**

```ts
it("accepts ootd like feedback for a specific card", async () => {
  const response = await request(app)
    .post("/api/companion/feedback")
    .send({
      userId: "local-user",
      journalId: "ootd_1",
      feedbackKind: "ootd_reaction",
      feedbackValue: "like_fullbody",
    });

  expect(response.status).toBe(201);
});
```

- [ ] **Step 5: Run targeted route tests and commit**

Run: `npm test -- src/companion/routes/companionRoutes.test.ts`
Expected: PASS with dual-card OOTD payload and like feedback accepted.

```bash
git add backend/src/companion/store/ootdStore.ts backend/src/companion/store/ootdStore.test.ts backend/src/companion/routes/companionRoutes.ts backend/src/companion/routes/companionRoutes.test.ts
git commit -m "feat: persist and serve dual-card ootd records"
```

### Task 3: Relationship Progression For Likes

**Files:**
- Modify: `backend/src/companion/services/relationshipProgressionService.ts`
- Modify: `backend/src/companion/services/relationshipProgressionService.test.ts`
- Modify: `backend/src/companion/services/journalPostProcessor.ts`
- Modify: `backend/src/companion/services/journalPostProcessor.test.ts`

- [ ] **Step 1: Write the failing progression test for OOTD likes**

```ts
it("adds a small style-alignment gain when ootd likes exist", () => {
  const service = createRelationshipProgressionService();
  const next = service.advance({
    previous,
    journalCount: 0,
    deepMemoryCount: 0,
    feedbackCount: 0,
    ootdLikeCount: 2,
  });

  expect(next.styleAlignmentScore).toBe(previous.styleAlignmentScore + 4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/companion/services/relationshipProgressionService.test.ts`
Expected: FAIL because `ootdLikeCount` is not part of the progression input yet.

- [ ] **Step 3: Implement minimal weighted OOTD like handling**

```ts
type ProgressInput = {
  previous: RelationshipStateRecord;
  journalCount: number;
  deepMemoryCount: number;
  feedbackCount: number;
  ootdLikeCount?: number;
};

next.styleAlignmentScore += input.feedbackCount > 0 ? 3 : 0;
next.styleAlignmentScore += (input.ootdLikeCount ?? 0) > 0 ? 2 : 0;
next.intimacyScore += (input.ootdLikeCount ?? 0) > 0 ? 1 : 0;
```

- [ ] **Step 4: Run targeted progression tests**

Run: `npm test -- src/companion/services/relationshipProgressionService.test.ts`
Expected: PASS with OOTD likes changing progression lightly.

- [ ] **Step 5: Commit**

```bash
git add backend/src/companion/services/relationshipProgressionService.ts backend/src/companion/services/relationshipProgressionService.test.ts backend/src/companion/services/journalPostProcessor.ts backend/src/companion/services/journalPostProcessor.test.ts
git commit -m "feat: count ootd likes in relationship progression"
```

### Task 4: Frontend API And Diary Wall Rendering

**Files:**
- Modify: `src/services/api/companionClient.ts`
- Modify: `src/types/diaryWall.ts`
- Modify: `src/pages/DiaryWallPage.tsx`
- Modify: `src/components/diaryWall/WallItemRenderer.tsx`
- Modify: `src/components/diaryWall/OotdWallItem.tsx`
- Test: `src/pages/DiaryWallPage.test.tsx`

- [ ] **Step 1: Write the failing diary wall test for two OOTD cards**

```tsx
it("renders full-body and makeup ootd cards as separate wall items", async () => {
  vi.mocked(fetchOotdByDate).mockResolvedValue({
    id: "ootd-1",
    userId: "local-user",
    date: "2026-05-25",
    title: "今日穿搭",
    rationale: null,
    styleTags: ["精致穿搭"],
    cards: [
      { id: "card-1", kind: "fullbody_selfie", imageUrl: "https://example.com/1.jpg", caption: "全身自拍" },
      { id: "card-2", kind: "makeup_closeup", imageUrl: "https://example.com/2.jpg", caption: "妆容自拍" },
    ],
    createdAt: "",
    updatedAt: "",
  });

  render(<DiaryWallPage onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

  expect(await screen.findByText("全身自拍")).toBeDefined();
  expect(screen.getByText("妆容自拍")).toBeDefined();
});
```

- [ ] **Step 2: Write the failing like interaction test**

```tsx
it("submits ootd like feedback when liking a card", async () => {
  const submit = vi.mocked(submitCompanionFeedback).mockResolvedValue(undefined);

  render(<DiaryWallPage onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

  fireEvent.click(await screen.findByRole("button", { name: "点赞全身自拍" }));

  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({
      userId: "local-user",
      journalId: "ootd-1",
      feedbackKind: "ootd_reaction",
      feedbackValue: "like_fullbody",
    }),
  );
});
```

- [ ] **Step 3: Implement minimal API and wall-item normalization**

```ts
type OotdCard = {
  id: string;
  kind: "fullbody_selfie" | "makeup_closeup";
  imageUrl: string | null;
  caption: string | null;
  poseTag?: "cute" | "sexy" | "elegant";
  liked?: boolean;
};

type OotdItem = {
  id: string;
  userId: string;
  date: string;
  title: string;
  rationale: string | null;
  styleTags: string[];
  cards: OotdCard[];
  createdAt: string;
  updatedAt: string;
};
```

```tsx
const ootdItems = (ootd?.cards ?? []).map((card) => ({
  kind: "ootd" as const,
  date: today,
  ootd,
  ootdCard: card,
  loading: ootdLoading,
  error: ootdError ?? undefined,
}));
```

- [ ] **Step 4: Run targeted diary wall tests**

Run: `npm test -- src/pages/DiaryWallPage.test.tsx`
Expected: PASS with two rendered OOTD cards and working like button flow.

- [ ] **Step 5: Commit**

```bash
git add src/services/api/companionClient.ts src/types/diaryWall.ts src/pages/DiaryWallPage.tsx src/components/diaryWall/WallItemRenderer.tsx src/components/diaryWall/OotdWallItem.tsx src/pages/DiaryWallPage.test.tsx
git commit -m "feat: render dual ootd cards with like feedback"
```

## Self-Review

- Spec coverage:
  - Dual-card daily OOTD: covered by Tasks 1, 2, and 4.
  - Selfie-first prompt constraints: covered by Task 1.
  - Likes as accumulated feedback: covered by Tasks 2, 3, and 4.
  - Lightweight relationship gain: covered by Task 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or “similar to” references remain.
- Type consistency:
  - Use `cards`, `fullbody_selfie`, `makeup_closeup`, and `ootd_reaction` consistently across backend and frontend tasks.

Plan complete and saved to `docs/superpowers/plans/2026-05-25-ootd-dual-card-feedback-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
