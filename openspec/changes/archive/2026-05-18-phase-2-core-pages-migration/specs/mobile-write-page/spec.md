## ADDED Requirements

### Requirement: Mood chip selection
The `MoodChip` component SHALL accept `mood` (Mood), `active` (boolean), and `onPress` props and render as a `Pressable` pill.

### Requirement: Mood chip active styling
When `active` is true, the chip SHALL have background `#fce5ea` and border color `#e89cae`.

### Requirement: Write screen title
The write screen SHALL display "写一篇新的手账" as the page title.

### Requirement: Mood selector row
The write screen SHALL display 5 mood options (开心, 想念, 感动, 平静, 调皮) as `MoodChip` components in a wrapping flex row.

### Requirement: Text input
The write screen SHALL have a multiline `TextInput` with placeholder "把今天的心情写下来", minimum height 220px, border radius 20, and white background.

### Requirement: Save button
The write screen SHALL have a save button labeled "保存手账" with background `#e89cae`, border radius 16, and centered text.

### Requirement: Save creates journal and navigates
Pressing save SHALL call `createJournalDraft(date, mood, content)`, then `saveJournal(journal)`, then `router.replace('/journal/{id}')`.

### Requirement: Default mood
The default selected mood SHALL be "开心".

#### Scenario: Selecting different mood chip
- **WHEN** user presses "想念" mood chip
- **THEN** "想念" chip shows active styling and `mood` state becomes "想念"

#### Scenario: Saving a journal
- **WHEN** user enters content and presses save
- **THEN** `createJournalDraft` is called with current date, mood, and content; journal is saved to store; navigation occurs to detail page