# Journal Storage And Generation Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix scene-hint generation, eliminate browser-local data divergence, and implement durable backend storage for journals, images, and audio.

**Architecture:** Move persistence responsibility from browser `localStorage` to backend-owned storage. Keep the frontend focused on UI state and API calls, while the backend becomes the source of truth for journals and generated media. Deliver in phases so text persistence stabilizes first, then media persistence, then migration and cleanup.

**Tech Stack:** React, TypeScript, Vite, Express, local filesystem storage on backend, existing generation APIs/task system

---

## File Map

- Modify: `src/pages/AskHerPage.tsx`
  - Pass `sceneHint` through the full "请她写" flow.
- Modify: `src/services/journalGeneration.ts`
  - Accept and forward `sceneHint`.
- Modify: `src/services/api/contentClient.ts`
  - Send `sceneHint` to backend content generation.
- Modify: `src/services/minimax.ts`
  - Explicitly include `sceneHint` in journal-image prompt construction.
- Modify: `src/App.tsx`
  - Replace browser-only persistence assumptions with backend load/save flow.
- Modify: `src/services/memory.ts`
  - Downgrade local storage to cache/fallback only, not source of truth.
- Modify: `src/types/journal.ts`
  - Ensure media fields support durable backend URLs/IDs.
- Modify: `backend/src/index.ts`
  - Add journal/media persistence endpoints and static serving.
- Create: `backend/src/storage/mediaStore.ts`
  - Save image/audio files and return stable URLs.
- Create: `backend/src/storage/journalStore.ts`
  - Persist journals metadata as backend-owned records.
- Create: `backend/storage/images/`
  - Durable image files.
- Create: `backend/storage/audio/`
  - Durable audio files.
- Create: `backend/storage/journals.json` or equivalent DB file
  - Initial durable journal metadata store.
- Test: `src/services/journalGeneration.test.ts`
- Test: `src/services/minimax.test.ts`
- Test: `src/services/api/contentClient.test.ts`
- Test: `backend/src/...` storage and API tests as needed

## Problem Summary

1. `sceneHint` exists in UI but is not passed into content generation.
2. Journal images currently depend on generated journal text, so scene changes do not reliably affect images.
3. Same URL shows different data in Chrome vs VS Code browser because journals live in per-browser `localStorage`.
4. Journal persistence is not durable; startup can auto-generate today's entry when prior local data is missing.
5. Voice data is not truly persisted; current storage model depends on browser-local base64 payloads.
6. Storing large audio payloads in `localStorage` risks quota overflow and journal loss.

## Phase Plan

### Phase 1: Fix Scene Hint Wiring

- [ ] Add `sceneHint` to `generateJournalDraft()` params in `src/services/journalGeneration.ts`.
- [ ] Pass `sceneHint` from `src/pages/AskHerPage.tsx` into `generateJournalDraft()`.
- [ ] Add `sceneHint` to `ContentGenerationInput` in `src/services/api/contentClient.ts`.
- [ ] Include `sceneHint` in the POST body to `/api/content-generation`.
- [ ] Verify backend already accepts `sceneHint` and keep that contract unchanged.
- [ ] Update tests to assert `sceneHint` is forwarded end-to-end.

### Phase 2: Make Scene Hint Affect Images Explicitly

- [ ] Extend `buildJournalImagePrompt()` in `src/services/minimax.ts` to accept optional `sceneHint`.
- [ ] Pass `sceneHint` into media generation from the "请她写" save flow.
- [ ] Ensure prompt uses `sceneHint` directly, not only extracted content context.
- [ ] Keep extracted context as fallback when no `sceneHint` is present.
- [ ] Add tests covering different scene hints producing different prompts.

### Phase 3: Introduce Backend Journal Persistence

- [ ] Create backend journal store module to read/write all journals from backend-owned storage.
- [ ] Add API endpoints to list journals and save/update journals.
- [ ] Load journals on frontend startup from backend first.
- [ ] Keep `localStorage` only as temporary fallback cache if backend is offline.
- [ ] Remove startup assumption that "missing local journals" means "generate today's journal now".
- [ ] Only auto-generate today when backend confirms no journal exists for today.

### Phase 4: Persist Generated Images On Backend

- [ ] Add backend media store utility to download generated image results and save them under `backend/storage/images/`.
- [ ] Return stable app-served URLs such as `/media/images/<file>`.
- [ ] Update image generation flows to store stable backend URLs in journals.
- [ ] Stop depending on temporary signed image URLs for long-term display.
- [ ] Add recovery logic for legacy journals that still contain remote image URLs.

### Phase 5: Persist Generated Audio On Backend

- [ ] Add backend audio persistence utility to save generated MP3 bytes under `backend/storage/audio/`.
- [ ] Return stable app-served URLs such as `/media/audio/<file>`.
- [ ] Update TTS flow so `voiceMessages[].audioUrl` becomes a stable backend URL.
- [ ] Stop storing large `data:audio/...` payloads in browser journal state for persistence.
- [ ] Keep in-memory playback support unchanged for current session UX.

### Phase 6: Frontend Data Source Cleanup

- [ ] Refactor `src/App.tsx` startup flow to use backend journals as source of truth.
- [ ] Update save flow to persist journal mutations via backend API.
- [ ] Keep selected journal ID and lightweight UI preferences in `localStorage` if desired.
- [ ] Remove misleading `mock`/`empty` behavior from primary journal loading path.
- [ ] Show explicit offline banner when backend persistence is unavailable.

### Phase 7: Migration And Compatibility

- [ ] On first startup after release, attempt to import old `localStorage` journals into backend if backend store is empty.
- [ ] Skip migration if backend already has data.
- [ ] For journals with base64 audio, keep playable as legacy records but do not re-save base64 on future writes.
- [ ] For journals with remote image URLs, optionally convert and store locally during migration or lazy access.
- [ ] Add one-time migration marker to avoid repeated imports.

### Phase 8: Validation And Guardrails

- [ ] Add tests for `sceneHint` forwarding.
- [ ] Add tests for image prompt variation by `sceneHint`.
- [ ] Add tests for backend journal CRUD.
- [ ] Add tests for media file persistence and returned URLs.
- [ ] Add tests proving frontend no longer loses history when browser storage is empty.
- [ ] Add tests or manual verification for Chrome and VS Code showing identical backend-backed data.

## Recommended Execution Order

1. Scene hint text path
2. Scene hint image path
3. Backend journal storage
4. Backend image storage
5. Backend audio storage
6. Migration and cleanup
7. Final regression pass

## Risks To Watch

- Large existing `localStorage` payloads may already be corrupted or truncated.
- Media migration may be partial if old remote URLs have already expired.
- Auto-generation logic may create duplicate "today" entries unless backend uniqueness is enforced by date/source rules.
- Audio persistence increases backend disk usage; retention policy may be needed later.

## Success Criteria

- Scene hint changes both generated journal text and generated images.
- Chrome and VS Code browser show the same journals for the same backend.
- Reopening the app preserves prior journals reliably across days.
- Voice messages remain playable after reload.
- Images remain viewable after reload without expired URLs.
- `localStorage` size no longer determines whether history survives.

## Suggested Delivery Split

- Milestone A: Scene hint fully works for text and image generation.
- Milestone B: Journals persist via backend and no longer diverge by browser.
- Milestone C: Images and audio persist via backend and survive reload.
- Milestone D: Migration/cleanup of legacy browser-stored data.
