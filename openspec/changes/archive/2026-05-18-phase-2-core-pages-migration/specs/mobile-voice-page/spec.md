## ADDED Requirements

### Requirement: Voice screen title
The voice screen SHALL display "语音页" as the page title.

### Requirement: Voice screen loads selected journal
The voice screen SHALL read `selectedJournalId` from `useJournalStore` and find the corresponding journal, falling back to the first journal if no selection.

### Requirement: Empty voice state
If no journal exists or `journal.voiceMessages` is empty, the screen SHALL display "暂无语音内容，后续可在这里播放和查看语音稿。" text.

### Requirement: Voice transcript card display
For each `VoiceMessage` in the journal's `voiceMessages` array, a `VoiceTranscriptCard` SHALL be rendered.

### Requirement: VoiceTranscriptCard renders all fields
`VoiceTranscriptCard` SHALL display `timing` label, `transcript` text (or "暂无语音稿" if empty), and `duration`.

#### Scenario: Voice screen shows empty state
- **WHEN** selected journal has no voice messages
- **THEN** empty state message is displayed

#### Scenario: Voice screen shows transcript cards
- **WHEN** selected journal has 3 voice messages
- **THEN** 3 VoiceTranscriptCard components are rendered