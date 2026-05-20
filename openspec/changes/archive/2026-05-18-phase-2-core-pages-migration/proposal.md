## Why

The mobile app shell is in place (Phase 1) but only has placeholder screens. This phase replaces the placeholders with real migrated pages — Home, Write, Voice, and Settings — using local state first and backend wiring where safe.

## What Changes

- Replace placeholder Home screen with a scrollable journal list
- Add `JournalCard` and `JournalList` components for the home flow
- Add a journal detail page at `app/journal/[id].tsx`
- Replace placeholder Write screen with a mood selector, text input, and save flow
- Add `MoodChip` component and `requestJournalDraft` API client
- Replace placeholder Voice screen with voice transcript display (data from selected journal)
- Replace placeholder Settings screen with preferences display and toggle
- Add `VoiceTranscriptCard` component
- Add shared domain types (`Journal`, `Mood`, `VoiceMessage`, `Preferences`)
- Add local persistence foundation (`journalStore`, `journalStorage`)
- Add date utility helpers

## Capabilities

### New Capabilities
- **mobile-home-page**: Home screen displaying a scrollable list of journal cards with date, mood, and content preview. Tapping a card navigates to journal detail.
- **mobile-journal-detail**: Journal detail page at `/journal/[id]` showing full content, mood, date, and a back button.
- **mobile-write-page**: Write screen with mood chip selector, multiline text input, and save button that creates a draft journal and navigates to its detail page.
- **mobile-voice-page**: Voice screen displaying voice transcript cards for the selected journal's voice messages.
- **mobile-settings-page**: Settings screen displaying current voice style preference and a toggle button to switch between `soft` and `warm`.
- **mobile-journal-store**: Zustand store holding `journals`, `selectedJournalId`, and `preferences` with `saveJournal` action.
- **mobile-journal-types**: Shared TypeScript types for `Journal`, `Mood`, `VoiceMessage`, `Preferences`, and domain helpers.

### Modified Capabilities
- **mobile-app-shell**: The placeholder screens in `app/` are replaced with real implementations — the navigation structure remains but screen content is migrated.

## Impact

- **New files**: ~20 files across `mobile-app/src/components/journal/`, `mobile-app/src/components/voice/`, `mobile-app/src/types/`, `mobile-app/src/store/`, `mobile-app/src/services/api/`, `mobile-app/src/hooks/`, `mobile-app/src/utils/`, `mobile-app/app/journal/`
- **Modified files**: `mobile-app/app/index.tsx`, `mobile-app/app/write.tsx`, `mobile-app/app/voice.tsx`, `mobile-app/app/settings.tsx`
- **New tests**: 3 test files for `journalStore`, `journalStorage`, `contentClient`
- **New docs**: `docs/mobile-phase-2-core-pages.md`
- **Backend impact**: `POST /api/content-generation` becomes reachable from mobile; no backend changes required