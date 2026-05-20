## 1. Mirror shared journal contract into mobile-app

- [x] 1.1 Create `mobile-app/src/types/journal.ts` — Journal, Mood, VoiceMessage, VoiceTiming, JournalSource, Preferences, JournalStatus types
- [x] 1.2 Create `mobile-app/src/utils/date.ts` — getTodayString, getWeekday, formatDisplayDate helpers
- [x] 1.3 Run `npm run typecheck` in mobile-app/ and verify exit 0

## 2. Add local journal persistence and bootstrap state

- [x] 2.1 Create `mobile-app/src/services/storage/journalStorage.ts` — emptyJournalState function and JournalStateSnapshot type
- [x] 2.2 Create `mobile-app/src/store/journalStore.ts` — useJournalStore with journals, selectedJournalId, preferences, setJournals, selectJournal, setPreferences, saveJournal; createJournalDraft factory
- [x] 2.3 Create `mobile-app/src/hooks/useJournalBootstrap.ts` — useJournalBootstrap hook
- [x] 2.4 Create `mobile-app/src/services/storage/journalStorage.test.ts` — test for emptyJournalState
- [x] 2.5 Create `mobile-app/src/store/journalStore.test.ts` — test for createJournalDraft
- [x] 2.6 Run `npm run test` in mobile-app/ and verify tests pass

## 3. Migrate Home page into mobile-native list flow

- [x] 3.1 Create `mobile-app/src/components/journal/JournalCard.tsx` — Pressable card with date, mood, 3-line content preview, selected border state
- [x] 3.2 Create `mobile-app/src/components/journal/JournalList.tsx` — FlatList wrapping JournalCard with keyExtractor and onPressJournal
- [x] 3.3 Update `mobile-app/app/index.tsx` — Replace placeholder with title, subtitle, and JournalList connected to store
- [x] 3.4 Create `mobile-app/app/journal/[id].tsx` — Journal detail page with useLocalSearchParams, back button, mood/date/content display, not-found handling
- [x] 3.5 Verify home screen renders journal list and tapping navigates to detail

## 4. Migrate Write page into native compose flow

- [x] 4.1 Create `mobile-app/src/services/api/contentClient.ts` — requestJournalDraft function calling POST /api/content-generation
- [x] 4.2 Create `mobile-app/src/services/api/contentClient.test.ts` — test mapping backend output to mobile draft shape
- [x] 4.3 Create `mobile-app/src/components/journal/MoodChip.tsx` — Pressable pill with active/inactive styling
- [x] 4.4 Update `mobile-app/app/write.tsx` — Mood selector row, multiline TextInput, save button that calls createJournalDraft and saveJournal, navigates to detail
- [x] 4.5 Run `npm run test` and verify content client test passes

## 5. Migrate Voice and Settings pages

- [x] 5.1 Create `mobile-app/src/components/voice/VoiceTranscriptCard.tsx` — Card displaying timing, transcript, duration
- [x] 5.2 Update `mobile-app/app/voice.tsx` — Load selected journal, render VoiceTranscriptCard list or empty state message
- [x] 5.3 Update `mobile-app/app/settings.tsx` — Display current voiceStyle, toggle button between soft/warm
- [x] 5.4 Verify voice and settings screens render without crashing

## 6. Document Phase 2 behavior and final verification

- [x] 6.1 Create `docs/mobile-phase-2-core-pages.md` — Phase note covering included and excluded features
- [x] 6.2 Run backend tests (`npm run test` in backend/) and verify all pass
- [x] 6.3 Run mobile tests (`npm run test` in mobile-app/) and verify vitest passes
- [x] 6.4 Run mobile typecheck (`npm run typecheck` in mobile-app/) and verify exit 0
- [x] 6.5 Verify Expo dev server starts and all core pages (Home, Write, Voice, Settings, Journal detail) are accessible