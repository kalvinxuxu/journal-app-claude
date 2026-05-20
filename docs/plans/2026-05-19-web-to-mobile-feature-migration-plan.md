# Web To Mobile Feature Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing `journal-app-claude` product capabilities from the current Web prototype into the Expo mobile app, so the mobile app becomes the primary product surface while the Web app remains a reference and auxiliary surface.

**Architecture:** Keep the existing Web codebase as the behavior reference, keep the existing Express backend as the API/task engine, and migrate capability slices into `mobile-app/` in business-priority order. Do not attempt a one-shot UI port. Rebuild mobile-native flows while reusing domain contracts, backend APIs, task orchestration, and stable pure logic wherever possible.

**Tech Stack:** Expo, React Native, Expo Router, TypeScript, Zustand, TanStack Query, AsyncStorage, existing Web services under `src/services/*`, existing Express backend under `backend/src/*`

---

## Scope

This plan covers the next migration stage after Phase 2 and Phase 3:

- align mobile with real Web product capability
- migrate the missing hand-journal workflow pieces
- migrate generation task orchestration
- migrate voice generation and playback workflow
- migrate selfie / media generation entry flow
- migrate Ask Her / memory-facing capability
- align settings, reminders, and export-related behavior

This plan intentionally excludes:

- app-store packaging and release engineering
- authentication / multi-user accounts
- offline-first sync conflict resolution
- analytics / production observability
- background task execution beyond basic polling and resume

---

## Current State

### Web reference surface

Current Web pages:

- `src/pages/HomePage.tsx`
- `src/pages/WritePage.tsx`
- `src/pages/VoicePage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AskHerPage.tsx`

Current Web service areas:

- `src/services/api/*`
- `src/services/generation/*`
- `src/services/journalGeneration.ts`
- `src/services/journalAggregation.ts`
- `src/services/memory.ts`
- `src/services/memoryRebuild.ts`
- `src/services/nightBonusSelfie.ts`
- `src/services/reminders.ts`
- `src/services/selfieSharing.ts`

Current backend capability areas:

- `backend/src/storage/journalStore.ts`
- `backend/src/storage/mediaStore.ts`
- `backend/src/generation/taskService.ts`
- `backend/src/generation/taskScheduler.ts`
- `backend/src/generation/taskRecovery.ts`
- `backend/src/generation/routes/*`

### Mobile current state

Already present in `mobile-app/`:

- startup and Expo Router shell
- Home / Write / Voice / Settings pages
- local journal store and persistence scaffold
- media field scaffold for image/audio
- minimal detail page
- partial real-device startup validation

Current gaps confirmed in testing:

- Home does not yet expose a production-ready navigation model
- Write can save locally, but does not yet match the full Web journal workflow
- Voice is still a display shell, not a generation/task-driven voice feature
- Ask Her does not exist yet in mobile
- generation task state is not yet migrated into mobile
- backend real-device connectivity is not yet fully validated

---

## Migration Principles

- Migrate by business flow, not by file parity
- Preserve backend contracts where already stable
- Prefer mobile-native UX over literal Web layout copying
- Keep Web as the reference implementation until mobile acceptance passes
- Land in thin vertical slices that can be tested on a real Android device
- Avoid introducing parallel business logic when existing pure logic can be reused

---

## Capability Mapping

### Capability 1: Journal core flow

Web source:

- `HomePage`
- `WritePage`
- `journalGeneration.ts`
- `journalAggregation.ts`

Mobile target:

- stronger Home navigation
- complete Write flow
- detail editing / refresh behavior
- journal list consistency after save/update/delete

Migration result:

- mobile can create, browse, inspect, and maintain journals with parity to the baseline Web flow

### Capability 2: Voice flow

Web source:

- `VoicePage`
- `src/services/generation/*`
- `src/services/api/contentClient.ts`

Mobile target:

- generate voice from journal content or task result
- show generation status
- poll and recover generation tasks
- play generated voice asset

Migration result:

- mobile voice page is task-driven instead of placeholder-driven

### Capability 3: Selfie / media generation

Web source:

- `mediaClient.ts`
- `nightBonusSelfie.ts`
- generation services and task store

Mobile target:

- select source image
- upload media
- create generation task
- poll result
- show generated selfie / reference image / bonus output

Migration result:

- mobile supports the same generation loop, even if visual polish comes later

### Capability 4: Ask Her / memory flow

Web source:

- `AskHerPage`
- `memory.ts`
- `memoryRebuild.ts`
- related content-generation services

Mobile target:

- mobile Ask Her page
- memory-backed prompt / answer generation
- regenerate / retry / empty-state behavior

Migration result:

- mobile app exposes the emotional memory product surface, not just journaling

### Capability 5: Settings / reminders / export preferences

Web source:

- `SettingsPage`
- `reminders.ts`
- export and preference services

Mobile target:

- stable settings persistence
- reminder time and voice style alignment
- export-mode and generation-preference alignment

Migration result:

- mobile settings become a true product control panel instead of a stub

---

## Delivery Strategy

Use four implementation phases after current Phase 3 work:

1. Phase 4: Core journal parity
2. Phase 5: Voice and generation task migration
3. Phase 6: Ask Her, memory, and media generation parity
4. Phase 7: Settings completion, navigation hardening, and acceptance stabilization

Each phase should end in real Android device validation before starting the next.

---

## Phase 4: Core Journal Parity

**Goal:** Make mobile journaling genuinely usable and structurally consistent with the current Web product.

### Scope

- add clear entry navigation from Home
- complete the Write flow UX
- support update/edit behavior if Web currently supports it
- refresh Home after save
- improve detail page parity
- define empty-state and first-entry behavior

### Files to reference

- `src/pages/HomePage.tsx`
- `src/pages/WritePage.tsx`
- `src/types/journal.ts`
- `src/services/journalGeneration.ts`

### Files to modify in mobile

- `mobile-app/app/index.tsx`
- `mobile-app/app/write.tsx`
- `mobile-app/app/journal/[id].tsx`
- `mobile-app/app/_layout.tsx`
- `mobile-app/src/components/journal/*`
- `mobile-app/src/store/journalStore.ts`
- `mobile-app/src/services/storage/journalStorage.ts`

### Required deliverables

- visible Home entry buttons for:
  - Write
  - Voice
  - Settings
  - Ask Her placeholder or page link if available
- robust journal save and list refresh behavior
- detail page that shows:
  - content
  - mood
  - date
  - images
  - voice attachments when present
- mobile-first empty states for no journals / no media / no voice

### Acceptance criteria

- from Home, user can reach Write in one tap
- after save, user lands on detail page
- returning to Home shows the new entry without restart
- selecting an entry from Home opens the correct detail page
- app restart preserves the created entry

### Risks

- local-first mobile store may diverge from Web if backend persistence is introduced later without a sync boundary
- homepage navigation may need a tab or segmented redesign after more pages land

---

## Phase 5: Voice And Generation Task Migration

**Goal:** Replace placeholder voice behavior with the real generation/task workflow used by the Web product.

### Scope

- port generation task contracts into mobile
- create a mobile task client against the existing backend
- migrate voice generation request flow
- add polling and recovery behavior
- connect completed task output to the voice page and journal detail

### Files to reference

- `src/pages/VoicePage.tsx`
- `src/services/generation/apiTaskClient.ts`
- `src/services/generation/taskPolling.ts`
- `src/services/generation/taskStore.ts`
- `src/services/generation/types.ts`
- `backend/src/generation/routes/*`
- `backend/src/generation/taskService.ts`

### Files to create or modify in mobile

- `mobile-app/src/services/generation/apiTaskClient.ts`
- `mobile-app/src/services/generation/taskPolling.ts`
- `mobile-app/src/services/generation/taskStore.ts`
- `mobile-app/src/services/generation/types.ts`
- `mobile-app/src/hooks/useGenerationTask.ts`
- `mobile-app/app/voice.tsx`
- `mobile-app/app/journal/[id].tsx`
- `mobile-app/src/store/journalStore.ts`

### Required deliverables

- mobile can request voice generation for a journal
- mobile can show statuses:
  - idle
  - loading
  - ready
  - error
- mobile polls task progress from backend
- completed voice result is stored into journal state
- failed tasks show retry entry points

### Acceptance criteria

- user can trigger voice generation from a valid journal
- user sees a loading state instead of a dead button
- once complete, voice page renders the generated asset
- app restart during in-flight task can recover or rehydrate visible task status

### Risks

- real-device connectivity will fail if backend URLs still point to `127.0.0.1`
- long-running tasks need clear timeout and retry semantics on mobile

---

## Phase 6: Ask Her, Memory, And Media Generation Parity

**Goal:** Migrate the emotional companion and media-generation features that distinguish the product from a plain diary.

### Scope

- build mobile Ask Her page
- migrate memory-aware prompt/answer flow
- wire memory rebuild when needed
- migrate selfie / reference image / night bonus generation entry points
- align image upload and task result display with Web behavior

### Files to reference

- `src/pages/AskHerPage.tsx`
- `src/services/memory.ts`
- `src/services/memoryRebuild.ts`
- `src/services/nightBonusSelfie.ts`
- `src/services/selfieSharing.ts`
- `src/services/api/mediaClient.ts`
- `src/services/generation/*`

### Files to create or modify in mobile

- `mobile-app/app/ask-her.tsx`
- `mobile-app/src/services/memory/memoryClient.ts`
- `mobile-app/src/services/memory/memoryRebuild.ts`
- `mobile-app/src/services/selfie/selfieGenerationClient.ts`
- `mobile-app/src/hooks/useAskHer.ts`
- `mobile-app/src/hooks/useSelfieGeneration.ts`
- `mobile-app/app/write.tsx`
- `mobile-app/app/journal/[id].tsx`
- `mobile-app/app/index.tsx`

### Required deliverables

- Ask Her page reachable from Home
- memory-backed answer request path
- visible loading, error, retry states
- mobile media generation action entry points
- generated selfie or related output visible in detail flow

### Acceptance criteria

- user can open Ask Her and submit a prompt
- user can receive or retry an answer
- user can start a selfie/media generation flow from a valid journal context
- task result can be observed in mobile without switching to Web

### Risks

- memory rebuild flows may expose backend assumptions not yet mobile-safe
- generated-image UX may need stronger progress messaging than the Web flow

---

## Phase 7: Settings Completion And App Surface Hardening

**Goal:** Turn the migrated feature set into a coherent mobile product surface.

### Scope

- finish settings parity
- align reminder and voice style behavior
- harden navigation
- clean up device startup and LAN API configuration
- run acceptance checks across Android real-device flows

### Files to reference

- `src/pages/SettingsPage.tsx`
- `src/services/reminders.ts`
- `src/services/export.ts`

### Files to create or modify in mobile

- `mobile-app/app/settings.tsx`
- `mobile-app/app/_layout.tsx`
- `mobile-app/app/index.tsx`
- `mobile-app/src/store/appStore.ts`
- `mobile-app/src/services/api/client.ts`
- `mobile-app/app.json`
- `mobile-app/src/services/reminders/*`

### Required deliverables

- settings persistence parity
- configurable backend host for real-device testing
- stable main navigation model
- app boot instructions for Android device testing
- reduced startup/debug friction

### Acceptance criteria

- mobile settings survive restart
- Android device can reach backend through a configurable LAN host
- user can navigate across Home / Write / Voice / Ask Her / Settings without dead ends
- core smoke test passes on device

### Risks

- reminder behavior may require platform-specific permission and background handling beyond current scope
- export behavior may need a separate mobile-native strategy rather than a Web-style implementation

---

## Cross-Cutting Workstreams

These workstreams should be touched inside each phase instead of deferred to the end.

### Testing

- preserve or expand unit tests for pure logic
- add focused tests for task clients and stores
- maintain a device smoke checklist after every phase

### Backend alignment

- do not create mobile-only backend business rules unless necessary
- prefer reusing existing generation/task/media endpoints
- explicitly document every backend gap discovered during migration

### Environment handling

- replace hardcoded `127.0.0.1` assumptions with environment-driven or in-app configurable host values
- keep Expo Go Android real-device testing as the baseline validation environment

### UX adaptation

- keep the emotional tone of the Web product
- redesign flows for touch-first navigation instead of browser-layout parity
- prefer short, explicit progress and retry messaging for long tasks

---

## Suggested Execution Order By Task

### Wave A

- finish Home navigation
- finish journal list/detail/write parity
- stabilize local persistence

### Wave B

- port generation task contracts
- wire voice generation and polling
- expose task status in Voice and Detail

### Wave C

- add Ask Her page
- port memory-related APIs
- wire selfie / media generation flow

### Wave D

- complete settings parity
- replace localhost assumptions
- execute Android real-device acceptance run

---

## Real-Device Acceptance Checklist

After each phase, validate on Android real device with Expo Go:

- app launches from QR without red screen
- Home renders and navigation entry points are visible
- Write flow works
- Detail flow works
- Voice flow behaves correctly for current phase scope
- backend-connected flows either succeed or fail with user-visible status
- app restart preserves expected local state

For backend-connected phases also verify:

- device can reach backend over LAN IP
- polling works over real network
- error states are recoverable without app reinstall

---

## Recommended Milestones

### Milestone 1

Mobile journaling is truly usable without Web fallback.

### Milestone 2

Mobile voice generation works end-to-end against backend tasks.

### Milestone 3

Mobile Ask Her and selfie/media generation cover the product’s signature features.

### Milestone 4

Mobile can serve as the primary daily-use surface, with Web reduced to reference/admin/demo roles.

---

## Out Of Scope Follow-Up Plan

After this migration plan is complete, the next likely document should cover:

- release packaging
- Android APK / internal testing distribution
- iOS device strategy
- push notification rollout
- offline queue and task resume hardening

---

## Conclusion

The correct next step is not to keep patching isolated mobile pages.

The correct next step is to migrate Web business capabilities into mobile in vertical slices:

- journal parity first
- generation task and voice second
- Ask Her and media generation third
- settings and hardening last

This keeps the product moving toward a real mobile-first app, instead of leaving mobile as a demo shell beside the Web prototype.
