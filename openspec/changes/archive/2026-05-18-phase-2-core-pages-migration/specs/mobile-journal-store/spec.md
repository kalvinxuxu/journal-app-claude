## ADDED Requirements

### Requirement: JournalStore state shape
The `useJournalStore` Zustand store SHALL expose: `journals: Journal[]`, `selectedJournalId: string | null`, `preferences: Preferences`, `setJournals`, `selectJournal`, `setPreferences`, `saveJournal`.

### Requirement: createJournalDraft factory
A `createJournalDraft(date, mood, content)` function SHALL create a `Journal` object with `source: "user"`, `images: []`, `voiceMessages: []`, and weekday derived from date.

### Requirement: saveJournal adds or updates
Calling `saveJournal(journal)` SHALL add the journal to the array if new, or replace it if the `id` already exists, and set `selectedJournalId` to the saved journal's id.

### Requirement: Initial preferences
Initial preferences SHALL be: `reminderTime: "21:30"`, `voiceStyle: "soft"`, `exportMode: "pdf"`.

#### Scenario: saveJournal adds new journal
- **WHEN** `saveJournal` is called with a journal whose `id` is not in the store
- **THEN** the journal is prepended to `journals` and `selectedJournalId` is set

#### Scenario: saveJournal updates existing
- **WHEN** `saveJournal` is called with a journal whose `id` already exists
- **THEN** the existing journal is replaced in the array

#### Scenario: createJournalDraft generates correct shape
- **WHEN** `createJournalDraft("2026-05-18", "开心", "测试内容")` is called
- **THEN** returned journal has `id: "journal-2026-05-18"`, `date: "2026-05-18"`, `weekday: "周一"`, `mood: "开心"`, `source: "user"`, `content: "测试内容"`, `images: []`, `voiceMessages: []`