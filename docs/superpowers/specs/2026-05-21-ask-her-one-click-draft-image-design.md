# Ask Her One-Click Draft + Image Design

**Goal:** Upgrade the `请她写` flow so one click generates the girlfriend-written journal draft first, then generates her image from the final draft description, and presents staged progress clearly in the UI before saving.

**Architecture:** Keep the existing `AskHerPage -> generateJournalDraft -> media generation` architecture, but move the media generation trigger into the initial one-click flow instead of waiting for a later explicit save step. Reuse the current prompt-building logic in `buildJournalImagePrompt` so the image remains derived from the final generated journal text plus optional `sceneHint`.

**Tech Stack:** React 18, TypeScript, existing generation task client, `generateJournalDraft`, `buildJournalImagePrompt`, `buildJournalMedia`, Vitest + Testing Library

---

## Current Behavior

- `AskHerPage` currently has a two-step flow:
  - click `请她写` to generate only the text draft
  - click `保存日记` to trigger image and voice generation before saving
- This means the product already uses generated draft content to build the image prompt, but the user experience does not communicate that flow clearly.
- The preview state only shows text after the first step, so the page feels incomplete even though the desired final experience is "she writes, then her image is generated from that scene."

---

## Product Decision

Use a single-action generation flow:

1. User chooses `日期 + 心情 + 场景提示`
2. User clicks `请她写`
3. App generates the journal draft first
4. App generates image and voice from the finalized draft
5. App shows one combined preview with:
   - generated journal text
   - generated image
   - generated voice preview state
6. User clicks `保存日记` only after the full preview is ready, or after a partial-success preview is available

This keeps the draft-to-image dependency explicit while making the experience feel like one feature instead of two separate steps.

---

## Scope

### In Scope

- Upgrade `AskHerPage` to perform draft generation and media generation in one click
- Add explicit staged status display during generation
- Show combined preview content after generation
- Keep partial-success behavior when text succeeds but image or voice fails
- Reuse existing task flow first, with direct API fallback if task output is incomplete

### Out of Scope

- No backend contract changes
- No redesign of `WritePage`
- No new image model or new task type
- No selfie generation in `AskHerPage`
- No cross-page refactor of all generation UIs

---

## UX Design

### Entry State

`AskHerPage` keeps:

- date picker
- mood picker
- optional `场景提示（可选）`
- one main CTA: `请她写`

Before generation there is no separate save CTA.

### Generation State

Replace the current generic `生成中...` behavior with explicit phases:

- `正在生成日记`
- `正在根据日记生成配图`
- `正在生成语音`

These phases should be shown in a dedicated status card near the action area. The card should persist during the full one-click flow so the user understands that image generation depends on the generated draft rather than the raw `sceneHint`.

### Result State

After the one-click flow completes, render one preview block containing:

- the generated journal text
- the generated image if available
- the generated voice preview if available
- a success or partial-success summary

The primary CTA changes from `请她写` to `保存日记`.

### Partial Failure State

If draft generation succeeds but media generation partially fails:

- still show the generated text
- show the available image or voice if one succeeded
- show per-channel status such as:
  - `图片生成失败`
  - `语音生成失败`
- keep `保存日记` available

This preserves user value instead of dropping the whole result because one channel failed.

### Full Failure State

If draft generation fails:

- no preview result is shown
- error card explains the failure
- primary CTA remains `请她写`

If draft succeeds but both image and voice fail:

- show the text draft
- show media failure summary
- still allow saving the text-only journal

---

## State Model

The current `saveState: "idle" | "generating" | "error"` is too coarse for the upgraded flow.

Introduce a more explicit phase model in `AskHerPage`, for example:

```ts
type AskHerPhase =
  | "idle"
  | "draft-generating"
  | "image-generating"
  | "voice-generating"
  | "preview-ready"
  | "partial-error"
  | "fatal-error";
```

Supporting state should include:

- `previewDraft`: generated draft payload
- `previewJournal`: full preview journal with generated media attached
- `generationErrors`: per-channel media errors
- `fatalError`: unrecoverable error text

The UI derives button labels and status copy from `AskHerPhase` instead of from a single boolean-style loading state.

---

## Data Flow

### Recommended Flow

When the user clicks `请她写`:

1. Call `generateJournalDraft({ mood, date, sceneHint, memoryEngine, voiceStyle })`
2. Build a draft `Journal` object from the returned content and voice scripts
3. Immediately generate media from that draft

Media generation order:

1. Build prompt with `buildJournalImagePrompt(draftJournal, { referenceImage, sceneHint })`
2. Run existing task-based `media_generation`
3. If task output is incomplete or task fails, fall back to `buildJournalMedia(draftJournal, { referenceImage, generateSelfies: false, sceneHint })`
4. Persist returned image/audio URLs if needed
5. Store the final result in `previewJournal`

This preserves the existing architecture while moving the trigger point earlier in the UX.

### Why Not Parallel Draft + Image Generation

Do not generate image in parallel from raw `sceneHint` alone:

- the image can drift from the final generated journal
- prompt quality is weaker before the final prose exists
- it introduces reconciliation complexity for low product value

The final draft should remain the canonical source for the image prompt.

---

## Rendering Rules

### Preview Block

Once `previewJournal` exists, the page should render:

- draft text card
- image preview grid if `previewJournal.images?.length`
- voice preview cards if `previewJournal.voiceMessages.length`

This means the image is visible before save, not only after persistence into the main journal list.

### Action Buttons

Rules:

- `idle`: show `请她写`
- `draft-generating`: disable CTA, show `正在生成日记`
- `image-generating`: disable CTA, show `正在根据日记生成配图`
- `voice-generating`: disable CTA, show `正在生成语音`
- `preview-ready`: show `保存日记`
- `partial-error`: show `保存日记` and keep warning card visible
- `fatal-error`: show `请她写` again

---

## Error Handling

### Draft Error

- stop the flow immediately
- set `fatalError`
- do not attempt image generation

### Image Error

- keep the text draft
- continue to voice generation when possible
- record `generationErrors.image`

### Voice Error

- keep the text draft and image
- record `generationErrors.voice`

### Incomplete Task Output

Current logic already treats missing task images or voice as incomplete and falls back. Keep that behavior. The upgraded design only changes when this happens in the user journey and how it is displayed.

---

## File-Level Plan

### Primary Files

- Modify: `src/pages/AskHerPage.tsx`
- Modify: `src/pages/AskHerPage.test.tsx`

### Optional Supporting Extraction

If `AskHerPage.tsx` becomes too dense, extract a tiny helper such as:

- `src/pages/askHerFlow.ts`

Only do this if phase handling and result mapping make the page too large to stay readable.

---

## Testing Strategy

Add or update tests to cover:

1. One click on `请她写` triggers draft generation first, then media generation
2. Scene hint is still passed into draft generation
3. Image prompt is built from the generated draft journal, not from raw form values alone
4. Status card shows staged copy during the flow
5. Successful generation reveals preview text + image before save
6. Partial image failure still keeps text preview and save button available
7. Draft failure returns to a retryable state without preview

Keep tests narrow and centered on `AskHerPage.test.tsx`.

---

## Acceptance Criteria

- User clicks `请她写` once and does not need a second action to start image generation
- The app generates the draft before generating the image
- The image prompt is derived from the final draft journal content
- The UI clearly displays generation phases
- The result preview can show text, image, and voice together before save
- Partial media failures do not block saving the generated text journal
- Existing task-first / fallback-second generation strategy remains intact

---

## Risks And Mitigations

### Risk: The page feels slower because more work happens before preview

Mitigation:
- use explicit phase messaging so users understand progress
- allow partial success instead of failing the whole flow

### Risk: `AskHerPage` accumulates too much orchestration logic

Mitigation:
- keep helper extraction available if the phase state and result mapping become hard to read

### Risk: Tests become brittle due to multiple async states

Mitigation:
- assert user-visible milestones instead of internal timings
- keep mocks deterministic

---

## Recommendation

Implement the feature as a single one-click flow with staged progress display and combined preview. This delivers the intended experience with minimal architectural disruption because the current code already has the necessary draft-first prompt chain; the upgrade is primarily about orchestration and state presentation.
