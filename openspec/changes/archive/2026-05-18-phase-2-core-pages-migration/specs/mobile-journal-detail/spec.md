## ADDED Requirements

### Requirement: Journal detail route
A new route at `app/journal/[id].tsx` SHALL render when the user navigates to `/journal/{id}`.

### Requirement: Journal detail loads from store
The journal detail screen SHALL find the journal by `id` from `useJournalStore` state using `useLocalSearchParams`.

### Requirement: Journal detail renders all fields
The journal detail screen SHALL display: back button, mood, date, and full content text.

### Requirement: Back navigation
Pressing the back button SHALL call `router.back()` to return to the home screen.

### Requirement: Journal not found handling
If no journal is found for the given `id`, the screen SHALL display "Journal not found" text.

#### Scenario: Navigating to valid journal detail
- **WHEN** user navigates to `/journal/journal-2026-05-18`
- **THEN** journal detail renders with mood, date, and content

#### Scenario: Navigating to non-existent journal
- **WHEN** user navigates to `/journal/nonexistent-id`
- **THEN** "Journal not found" is displayed