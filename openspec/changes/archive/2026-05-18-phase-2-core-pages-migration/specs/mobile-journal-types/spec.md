## ADDED Requirements

### Requirement: Journal type definition
The `Journal` type SHALL contain: `id`, `date`, `weekday`, `mood: Mood`, `source: JournalSource`, `content: string`, `images?: string[]`, `selfies?: string[]`, `voiceMessages: VoiceMessage[]`, `voiceStyle?: "soft" | "warm" | "playful"`, and optional media status fields.

### Requirement: Mood type
`Mood` SHALL be `"开心" | "想念" | "感动" | "平静" | "调皮"`.

### Requirement: VoiceMessage type
`VoiceMessage` SHALL contain: `id`, `timing: VoiceTiming`, `transcript: string`, `duration: string`, and optional `audioUrl`.

### Requirement: VoiceTiming type
`VoiceTiming` SHALL be `"morning" | "afternoon" | "night"`.

### Requirement: JournalSource type
`JournalSource` SHALL be `"user" | "girlfriend"`.

### Requirement: Preferences type
`Preferences` SHALL contain: `reminderTime: string`, `voiceStyle: "soft" | "warm" | "playful"`, `exportMode: "pdf" | "image" | "none"`.

### Requirement: getTodayString utility
`getTodayString()` SHALL return the current date as an ISO string split on "T"[0] (e.g., "2026-05-18").

### Requirement: getWeekday utility
`getWeekday(dateStr)` SHALL return the Chinese weekday name (e.g., "周一") for a date string.

### Requirement: formatDisplayDate utility
`formatDisplayDate(dateStr)` SHALL return a formatted Chinese date string (e.g., "5月18日").

#### Scenario: Journal type correctly represents user journal
- **WHEN** a user journal is created with `createJournalDraft`
- **THEN** it satisfies the `Journal` type with all required fields

#### Scenario: getWeekday returns correct weekday
- **WHEN** `getWeekday("2026-05-18")` is called
- **THEN** it returns "周一" (assuming May 18 2026 is a Monday)