## ADDED Requirements

### Requirement: Settings screen title
The settings screen SHALL display "设置" as the page title.

### Requirement: Current voice style display
The settings screen SHALL display the current `preferences.voiceStyle` value (soft, warm, or playful).

### Requirement: Voice style toggle button
The settings screen SHALL have a button labeled "切换语音风格" that toggles the voice style between "soft" and "warm".

### Requirement: Preferences state from store
Settings screen SHALL read `preferences` and `setPreferences` from `useJournalStore`.

#### Scenario: Toggle switches voice style
- **WHEN** user presses toggle button while `voiceStyle` is "soft"
- **THEN** `setPreferences` is called with `voiceStyle: "warm"`
- **WHEN** user presses toggle button while `voiceStyle` is "warm"
- **THEN** `setPreferences` is called with `voiceStyle: "soft"`