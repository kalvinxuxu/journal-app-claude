## ADDED Requirements

### Requirement: Home screen journal list
The home screen at `app/index.tsx` SHALL display a scrollable list of journal entries using `FlatList` and `JournalCard` components.

### Requirement: Journal list header
The home screen SHALL display a title "女友手账" and a subtitle "今天也记录一点温柔吧" above the journal list.

### Requirement: Journal card display
Each `JournalCard` SHALL display the journal's formatted date, mood label, and a 3-line content preview.

### Requirement: Journal card selection state
A `JournalCard` SHALL show a selected state with border color `#e89cae` when its journal ID matches the `selectedJournalId` in the store.

### Requirement: Journal card press navigation
Pressing a `JournalCard` SHALL call `selectJournal(id)` and navigate to `/journal/{id}` via `router.push()`.

### Requirement: Journal list receives store data
The `JournalList` component SHALL receive `journals`, `selectedJournalId`, and `onPressJournal` as props and render them via `FlatList`.

#### Scenario: Home screen renders with empty journal list
- **WHEN** home screen renders with `journals: []`
- **THEN** FlatList renders with no items and no crash

#### Scenario: Home screen renders with journals
- **WHEN** home screen renders with 3 journal entries in the store
- **THEN** FlatList renders 3 JournalCard items

#### Scenario: Journal card selection highlights
- **WHEN** a journal card is rendered with `journal.id === selectedJournalId`
- **THEN** its border color is `#e89cae`

#### Scenario: Tapping journal card navigates to detail
- **WHEN** user presses a JournalCard
- **THEN** `selectJournal(id)` is called and router navigates to `/journal/{id}`