# Product Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current prototype into a product-usable journaling app by fixing the media pipeline first, then landing real generation, persistent memory, and missing user-facing product features.

**Architecture:** Execute in vertical slices instead of cross-cutting rewrites. First stabilize the MiniMax integration and remove client-side secret exposure, then wire generation + memory into one coherent content pipeline, then finish user-facing feature gaps in settings/voice/export flows.

**Tech Stack:** React, TypeScript, Vite, Vitest, browser fetch API, localStorage, MiniMax APIs, lightweight local service modules

---

## Scope Split

This work spans multiple independent subsystems. Do not implement it as one long branch without checkpoints.

Recommended split:

1. Media platform hardening
2. Content generation pipeline
3. Memory persistence and rebuild
4. User-facing feature completion
5. Product deepening work

Each phase below should produce a working, testable state on its own.

---

## File Structure Map

### Existing files likely to change

- `src/services/minimax.ts`
  - Current MiniMax client logic for images, TTS, selfies
- `src/pages/WritePage.tsx`
  - Save flow and media generation feedback
- `src/pages/SettingsPage.tsx`
  - Character regeneration, settings UI, future “about” block
- `src/App.tsx`
  - App bootstrap, automatic selfie generation, memory restore point
- `src/services/memory.ts`
  - localStorage persistence, restore helpers
- `src/services/generator.ts`
  - shared memory engine, draft generation helpers
- `src/services/journalGeneration.ts`
  - draft generation entry
- `src/pages/VoicePage.tsx`
  - current voice playback screen
- `src/components/VoicePlayer.tsx`
  - playback controls and transcript expansion
- `src/types/journal.ts`
  - app-level domain model and preferences

### New files recommended

- `src/services/api/mediaClient.ts`
  - thin frontend client for server-backed media endpoints
- `server/index.ts` or `api/*.ts`
  - server-side proxy endpoints for MiniMax requests
- `src/services/export.ts`
  - export entry for PDF/image output modes
- `src/services/reminders.ts`
  - reminder scheduling abstraction for web prototype
- `src/services/memoryRebuild.ts`
  - rebuild runtime memory engine from persisted journals
- `src/pages/AboutSection.tsx` or inline block in settings
  - product/about information

### Test files likely to change/add

- `src/services/minimax.test.ts`
- `src/pages/WritePage.test.tsx`
- `src/pages/SettingsPage.test.tsx`
- `src/pages/VoicePage.test.tsx`
- `src/services/memory.test.ts`
- `src/services/journalGeneration.test.ts`
- `src/services/export.test.ts`

---

## Phase 1: Media Platform Hardening

**Outcome:** Image generation and selfie generation are reliable, user-visible failures are explicit, and API keys are no longer shipped to the browser.

**Files:**

- Modify: `src/services/minimax.ts`
- Modify: `src/pages/WritePage.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/services/minimax.test.ts`
- Create: `src/services/api/mediaClient.ts`
- Create: server endpoint files appropriate for the repo setup

- [ ] Define the server boundary for image/TTS/selfie calls.
- [ ] Choose a concrete server shape for this repo:
  - Vite dev proxy + lightweight node server, or
  - co-located API handler directory if you intend to deploy on a serverless platform.
- [ ] Move MiniMax API key usage out of frontend-visible `VITE_*` variables.
- [ ] Replace direct browser MiniMax calls with frontend calls to internal media endpoints.
- [ ] Normalize MiniMax base URL configuration in one place.
- [ ] Remove or redesign the current `character_id`-based selfie consistency flow.
- [ ] Rework selfie consistency around the actually supported reference-image workflow.
- [ ] Change image failure handling so “placeholder fallback” is clearly separated from “real generation success”.
- [ ] Surface selfie generation errors in both settings and app bootstrap flows.
- [ ] Update tests to cover:
  - server-backed media success
  - explicit image-generation failure UI
  - selfie regeneration error visibility
  - no client-side dependency on `VITE_MINIMAX_API_KEY`

**Verification:**

- Image generation request no longer leaves the browser with bearer token to MiniMax
- Write flow distinguishes:
  - saved with generated media
  - saved without media
  - generation failed
- Settings page shows an actionable failure state for selfie generation

**Exit criteria:**

- Daily journal image generation works end-to-end
- Selfie generation works end-to-end
- No frontend secret exposure remains in the media path

---

## Phase 2: Real Content Generation Pipeline

**Outcome:** Journal text and voice-message text are generated by a real content pipeline rather than only local templates.

**Files:**

- Modify: `src/services/journalGeneration.ts`
- Modify: `src/services/generator.ts`
- Modify: `src/types/journal.ts`
- Add/Modify: `src/services/api/contentClient.ts`
- Add/Modify: server content generation endpoint(s)
- Test: `src/services/journalGeneration.test.ts`

- [ ] Define the content-generation contract:
  - input: date, mood, recalled memory, optional relationship context
  - output: journal content, 2-3 voice message scripts
- [ ] Separate “draft creation” from “final enrichment”.
- [ ] Keep the current local generator as a fallback path for development/offline states.
- [ ] Add a real generation path for journal content.
- [ ] Add a real generation path for voice message scripts.
- [ ] Ensure journal text and voice scripts are generated from one shared emotional/context payload.
- [ ] Preserve stable frontend types even if the generation backend changes later.
- [ ] Add tests covering:
  - local fallback path
  - successful remote generation
  - partial failure behavior
  - structure validation for returned voice messages

**Verification:**

- A newly created journal can produce:
  - generated diary content
  - generated 2-3 voice scripts
  - the same emotional line across both

**Exit criteria:**

- The app is no longer template-only for its core emotional content path

---

## Phase 3: Persistent Memory Rebuild

**Outcome:** Memory behavior survives reloads and can later be swapped to a remote memory store without changing app-level contracts.

**Files:**

- Modify: `src/services/memory.ts`
- Modify: `src/services/generator.ts`
- Modify: `src/App.tsx`
- Create: `src/services/memoryRebuild.ts`
- Test: `src/services/memory.test.ts`

- [ ] Document the canonical persisted journal shape used for memory rebuild.
- [ ] Add a utility that rebuilds runtime memory state from saved journals on app startup.
- [ ] Call the rebuild utility exactly once during bootstrap.
- [ ] Ensure adding a new journal updates both:
  - persisted journals
  - runtime memory
- [ ] Keep the rebuild logic isolated from UI code.
- [ ] Add tests covering:
  - cold start from existing journals
  - empty storage start
  - journal append followed by reload
  - no duplicate memory insertion on repeated init

**Verification:**

- Refreshing the app retains memory-informed generation behavior.

**Exit criteria:**

- Memory is no longer “session-only”.

---

## Phase 4: Settings and Voice Feature Completion

**Outcome:** Settings stop being decorative, and voice browsing behaves like a complete user flow.

**Files:**

- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/VoicePage.tsx`
- Modify: `src/components/VoicePlayer.tsx`
- Modify: `src/types/journal.ts`
- Create: `src/services/export.ts`
- Create: `src/services/reminders.ts`
- Test: `src/pages/SettingsPage.test.tsx`
- Test: `src/pages/VoicePage.test.tsx`

- [ ] Add an “About” section to settings.
- [ ] Define how `voiceStyle` affects generation:
  - prompt modifier
  - voice setting mapping
  - or both
- [ ] Wire `voiceStyle` into the actual voice generation flow.
- [ ] Define a web-appropriate reminder implementation for this prototype:
  - lightweight local reminder abstraction
  - explicit unsupported-state message if browser notifications are unavailable
- [ ] Make `reminderTime` drive that reminder abstraction.
- [ ] Implement export entry points based on `exportMode`.
- [ ] Start with one fully working export target first:
  - PDF recommended, or
  - image export if it better matches the product direction
- [ ] Add previous/next navigation on the voice page across the selected journal’s voice messages.
- [ ] Ensure transcript and playback state stay in sync when switching messages.
- [ ] Add tests for:
  - settings persistence + behavior
  - voice previous/next navigation
  - export-mode branching
  - unsupported reminder fallback behavior

**Verification:**

- Users can actually feel the impact of settings choices.
- Voice page works as a multi-message experience, not a single-message stub.

**Exit criteria:**

- Settings control behavior, not just stored form values.

---

## Phase 5: Product Deepening

**Outcome:** The app starts behaving like a coherent product system instead of a collection of screens.

**Files:**

- Modify: `src/services/minimax.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/JournalCard.tsx`
- Add/Modify: orchestration services for multi-agent or multi-stage content shaping
- Add tests for new orchestration behavior

- [ ] Define rules for “主动分享自拍”:
  - when it triggers
  - when it does not
  - how it attaches to a journal entry
- [ ] Make selfie generation timing part of app logic rather than a loose side effect.
- [ ] Design a first-pass orchestration boundary between:
  - girlfriend voice/content generation
  - counselor/polish constraints
- [ ] Convert memory recall modes into explicit generation strategies.
- [ ] Document cross-platform data boundaries needed for later iOS reuse.

**Verification:**

- Product behavior becomes more intentional and less ad hoc.

**Exit criteria:**

- Core journaling, voice, memory, and selfie features behave like one system.

---

## Dependencies and Order

Strict order:

1. Phase 1 before any further MiniMax-dependent work
2. Phase 2 after Phase 1 server boundary is in place
3. Phase 3 before evaluating memory-aware content quality
4. Phase 4 can start after Phase 1, but `voiceStyle` should wait for Phase 2 integration details
5. Phase 5 only after Phases 1-4 are stable

Parallelizable work after Phase 1:

- Phase 3 memory rebuild
- Phase 4 about/export/voice-navigation work

Avoid parallelizing these together:

- Phase 1 and Phase 2 content-integration edits in the same media/generation files

---

## Milestones

### Milestone A: Prototype no longer broken

- Image generation fixed
- Selfie generation fixed
- No frontend-exposed MiniMax key
- Clear UI errors

### Milestone B: Core experience feels alive

- Real journal generation
- Real voice-script generation
- Memory rebuild on reload

### Milestone C: Product behavior matches settings

- Reminder setting works
- Voice style affects output
- Export path exists
- Voice page supports message switching

### Milestone D: Product system feels intentional

- Selfie-sharing rules are explicit
- Recall modes are better shaped
- iOS reuse boundaries are documented

---

## Risks

- MiniMax image/selfie API behavior may change again; keep adapters isolated.
- Content quality may regress if memory payload shape is not stabilized early.
- Reminder behavior on web may vary by browser; avoid over-promising native-like scheduling.
- Export implementation can balloon in scope if PDF and image export are attempted together in the first pass.

---

## Recommended Next Detailed Plans

Write separate child execution plans in this order:

1. `2026-05-13-media-hardening-plan.md`
2. `2026-05-13-content-generation-plan.md`
3. `2026-05-13-memory-rebuild-plan.md`
4. `2026-05-13-settings-and-voice-plan.md`

Each child plan should contain the task-by-task TDD steps for actual execution.
