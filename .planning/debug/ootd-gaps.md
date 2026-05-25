---
status: investigating
trigger: "OOTD dual-card feedback implementation gaps"
created: 2026-05-25T00:00:00Z
updated: 2026-05-25T00:00:00Z
---

## Current Focus
hypothesis: "Systematic investigation of all 4 gaps using scientific method"
test: "Read relevant files for each gap, confirm symptoms, identify root causes"
expecting: "Complete diagnosis of each gap with specific file:line references"
next_action: "Begin reading files for Gap 1 (backend progression chain)"

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

### Gap 1: OOTD like not connected to relationship progression chain
- `feedbackStore.countOotdReactionsByUserId` exists at backend/src/companion/store/feedbackStore.ts:47
- `relationshipProgressionService` and `journalPostProcessor` support `ootdLikeCount`
- BUT `companionRoutes.ts:112` `/feedback` endpoint only writes to DB, doesn't trigger relationship advancement
- User confirmed via grep that `countOotdReactionsByUserId` is NOT called anywhere in companionRoutes

### Gap 2: Frontend "like OOTD card" not implemented
- `submitCompanionFeedback` call does NOT exist in DiaryWallPage.tsx or OotdWallItem.tsx
- The test file DiaryWallPage.test.tsx:23 mocks `submitCompanionFeedback` but has NO test case exercising it
- Plan required like button with `feedbackKind: "ootd_reaction"` and `feedbackValue: "like_fullbody"` or `"like_makeup"`

### Gap 3: Frontend "dual-card separate rendering" incomplete
- `companionClient.ts` already has `cards` field in OotdItem type
- BUT `diaryWall.ts` still only has single `ootd` wall item type — no `ootdCard` level normalization
- `OotdWallItem.tsx:32` renders second card inside same component (hardcoded), not "separate wall items" as plan specified
- Plan said: "Normalize one OOTD set into two rendered cards" — needs to create TWO WallItemRenderer calls

### Gap 4: Backend tests not runnable
- `vitest.config.ts` only includes `src/**/*.test.*` and `backend/src/migration/**/*.test.ts`
- Companion backend tests (ootdService.test.ts, ootdStore.test.ts, etc.) are NOT included
- `npm test` only runs frontend tests; backend tests get "No test files found"

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: [empty until found]
fix: [empty until applied]
verification: [empty until verified]
files_changed: []