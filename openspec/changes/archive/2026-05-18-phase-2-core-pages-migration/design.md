## Context

Phase 1 created the mobile app shell with placeholder screens. Phase 2 migrates the four core pages from the web prototype into native React Native components. The mobile app uses Expo Router for navigation, Zustand for state, and local-first persistence before wiring to the backend.

**Constraints:**
- Local state first — no direct backend persistence yet
- Mobile app uses the same domain types as the web app (`Journal`, `Mood`, `VoiceMessage`, etc.)
- Backend `POST /api/content-generation` is the only backend call in scope for this phase
- Screen components must use React Native primitives, not web DOM elements

## Goals / Non-Goals

**Goals:**
- Replace all four placeholder screens with functional migrated pages
- Add a journal detail page (`/journal/[id]`) reachable from the home list
- Enable saving a new journal from the Write page and navigating to its detail
- Display voice transcript data from the selected journal on the Voice page
- Display and toggle the voice style preference on the Settings page
- Keep all TypeScript strict-mode compliant

**Non-Goals:**
- Backend persistence (journals remain in memory/Zustand for now)
- Voice recording and playback (future phase)
- Image picker and selfie generation (future phase)
- Push notifications (future phase)
- Authentication (future phase)

## Decisions

### Local Zustand store over AsyncStorage persistence for this phase

**Decision:** Use Zustand `useJournalStore` as the primary state holder with in-memory journals array.

**Why:** Phase 2 focuses on UI migration, not persistence infrastructure. Zustand store is sufficient to unblock all four page implementations and can be wired to AsyncStorage in a later phase.

**Alternatives considered:**
- Directly use AsyncStorage: would require async load/save boilerplate in every component, slowing development
- Use TanStack Query with a mock API: overkill for local-first, would add unnecessary network layer

### Journal list on Home using FlatList

**Decision:** Home screen uses `FlatList` with `JournalCard` items.

**Why:** FlatList is the standard React Native list primitive with built-in scroll performance and memory optimization. The web prototype uses a card flow — this maps directly to `FlatList` + `Pressable` cards.

**Alternatives considered:**
- `SectionList`: not needed since journals are not grouped by section
- `map` + `ScrollView`: would degrade performance with large lists

### Write page uses React Hook Form — not for this phase

**Decision:** Write page uses controlled `useState` inputs instead of React Hook Form.

**Why:** This phase only needs mood selection and text input — minimal form complexity. Adding React Hook Form would be premature. It can be added when validation requirements grow (e.g., required fields, character limits).

**Alternatives considered:**
- React Hook Form: adds a dependency before form complexity warrants it
- Formik: same concern, heavier than needed

### Mood selection via MoodChip pressable pills

**Decision:** Moods are represented as `Pressable` pill components in a wrap flex row.

**Why:** Mirrors the web prototype's mood chip pattern. Simple, mobile-native, and touch-friendly.

### Navigation: Expo Router with Stack navigator

**Decision:** Keep the Stack navigator from Phase 1. New routes: `/journal/[id]`.

**Why:** Phase 1 already established the Stack navigator with `headerShown: false`. Extending to a new dynamic route is straightforward.

**Alternatives considered:**
- Tab navigator: not desired — each page has its own concern and doesn't need a tab bar for this prototype

## Risks / Trade-offs

- [Risk] State is ephemeral — refreshing the app resets journals. → Mitigation: AsyncStorage persistence planned for Phase 3.
- [Risk] Content generation API call has no retry logic. → Mitigation: write page saves locally even if API fails; error state shown.
- [Trade-off] No image upload means journals saved from Write page have empty `images` array. → Accepted: image feature is out of scope.

## Migration Plan

1. Add domain types and date utilities (shared foundation)
2. Add Zustand store and local storage interface
3. Replace Home screen with journal list and add journal detail page
4. Replace Write screen with mood selector, text input, and save flow
5. Replace Voice screen with transcript cards from selected journal
6. Replace Settings screen with preference display and toggle
7. Add documentation

No rollback needed — all changes are additive replacements of placeholder implementations.