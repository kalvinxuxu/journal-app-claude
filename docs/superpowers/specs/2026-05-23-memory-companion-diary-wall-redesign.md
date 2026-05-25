# Memory Companion Diary Wall Redesign

**Date:** 2026-05-23  
**Status:** Proposed  
**Owner:** Codex

---

## Summary

The current product still exposes two competing writing modes, `我来写` and `请她写`, while several companion behaviors are split across journaling, greeting, and image-generation surfaces. That makes the experience feel like a collection of tools instead of one coherent relationship product.

This redesign consolidates companion-created content into a single primary surface: `日记墙`.

In the new model:

- `我来写` is removed as a standalone user-facing mode.
- `请她写` is no longer treated as a one-off generation tool and is upgraded into `日记墙`.
- Daily journal generation remains, but becomes part of the wall.
- Daily journal generation supports both:
  - automatic background creation
  - manual regenerate/refresh by the user
- `每日OOTD` is added as a companion-authored daily item.
- `每日问候` returns as a background-generated message the user sees when they come back.
- Greeting content opens through a typewriter-style reveal, so it feels like she is speaking in the moment rather than dumping a static paragraph.

The result should feel less like “which tool do I use?” and more like “she has been here, recording, dressing, and waiting to say something.”

---

## Problem

The current product has three structural issues.

### 1. Two writing modes create confusion

`我来写` and `请她写` imply two different products:

- one where the user authors and the system decorates
- one where the companion authors and the system generates media

In practice, the distinction is not strong enough to justify two separate mental models. The split makes the experience harder to understand and weaker emotionally.

### 2. Companion outputs are fragmented

Journal content, image generation, greeting behavior, and styling/presentation cues do not yet feel like they belong to one living companion system.

The user should not have to infer:

- which surface is for journaling
- which surface is for greetings
- which surface is for “her daily presence”

### 3. Greeting and journal are mixed at the wrong layer

Greeting content should not interrupt the “generate a diary entry” flow. It belongs to asynchronous companion presence:

- she already prepared something
- you log in later
- you see it waiting

That is a different emotional pattern from “generate today’s diary now.”

---

## Product Goal

Create one companion-centered content system where the user experiences her through a single evolving wall of daily presence.

That wall should include:

- the diary she records for the day
- the outfit she chose for the day
- the greeting she prepared for the user

The system should feel persistent rather than reactive-only.

---

## Design Principles

### Companion-first, not tool-first

The user should feel they are visiting her space, not choosing between multiple utilities.

### Daily presence over isolated actions

The wall should communicate continuity:

- she recorded something today
- she chose something today
- she wanted to say something today

### Auto by default, manual when desired

The product should proactively prepare daily content, but the user can still ask for a refresh or a regeneration when they want a different version.

### Keep the emotional channels separate

- diary = record of the day
- OOTD = visual self-expression
- greeting = direct message to the user

These should live in one system, but not collapse into the same content block.

### Real-time feeling without real-time pressure

Greetings should feel alive when opened, but they do not require the user to be present at generation time.

---

## Proposed Product Structure

## 1. Remove `我来写`

The standalone `我来写` mode should be removed from the product.

This means:

- no home entry for `我来写`
- no separate route/page presented as a primary path
- no copy that suggests two equal writing modes

This does not mean the system loses journal generation. It means journal generation is no longer framed as a separate authoring mode owned by the user.

---

## 2. Upgrade `请她写` into `日记墙`

The current `请她写` page should be redefined as `日记墙`.

Its purpose changes from:

- “generate a single diary entry now”

to:

- “see what she has recorded, prepared, and left for today”

The wall becomes the main companion content surface.

### Core feed items

The wall should support at least three item types:

- `daily_journal`
- `daily_ootd`
- `daily_greeting`

The wall can render them in a stable visual order or by timestamp, but it should feel like one unified daily feed rather than three isolated tabs.

---

## 3. Keep journal generation in two modes

The diary function stays, but it changes shape.

### Automatic daily journal

Each day, the system should ensure there is a generated companion journal entry for that day.

The preferred behavior is:

- if the user opens the app and today’s journal does not exist, the system catches up and prepares one
- if backend scheduling exists later, generation may happen before login

### Manual regenerate/refresh

The user should still be able to ask for a new version.

This is not a second writing mode. It is a refresh action inside the diary wall.

Recommended interaction:

- current day journal card shows a `重新记录今天` or equivalent action
- pressing it replaces the current generated daily journal entry rather than creating an uncontrolled duplicate

### Why both are needed

Auto generation supports continuity and presence.

Manual regeneration supports agency and freshness.

The combination preserves the useful part of today’s system without preserving the confusing two-mode structure.

---

## 4. Add `每日OOTD`

The companion should generate one OOTD item per day.

OOTD should feel like self-expression, not catalog merchandising.

### OOTD content shape

Each OOTD item should include:

- one image
- one short title or label
- one short caption or reason

Example emotional role:

- “这是她今天想穿的”
- not “here is a productized outfit block”

### OOTD behavior

- generated automatically each day
- may optionally support manual refresh
- lives inside the same diary wall feed

### OOTD tone

The copy should stay short and attractive.

It should not over-explain:

- fabric
- styling theory
- technical fashion language

The goal is intimacy and daily presence.

---

## 5. Restore `每日问候` as background-generated content

Daily greeting should return, but not inside the diary generation flow.

### Background generation model

When enabled, the system should prepare a daily greeting in the background.

The user may be offline or busy when this happens.

When they next open the app:

- the greeting is already waiting
- it is visible as unread or pending content

This makes the companion feel persistent even when the user is not actively generating something.

### Greeting is not part of diary preview

A greeting should not appear as a block under a generated journal entry.

It should be represented as its own wall item or home card.

---

## 6. Greeting open interaction uses typewriter reveal

When the user taps the pending greeting, the content should not simply appear all at once.

It should open like a message being written to them.

### Desired feeling

- light anticipation
- a sense of presence
- more intimate than a static card

### Interaction model

- user sees pending greeting state
- user taps to open
- text reveals in a typewriter pattern
- optional second tap can skip to full content

### Read state

The greeting should then move from unread to opened.

Whether read state is committed on open-start or open-complete can be finalized during implementation, but the user-facing behavior should clearly signal:

- this was waiting for you
- now you’ve seen it

---

## Home Page Changes

Home should no longer present two parallel “write” choices.

Instead, home should:

- provide a single entry to `日记墙`
- show whether today’s greeting is waiting
- optionally surface a lightweight summary of today’s wall state

For example:

- today’s journal ready
- OOTD ready
- greeting unread

The important point is that home should frame the product as one companion stream, not multiple disconnected tools.

---

## Information Architecture

### Before

- Home
- 我来写
- 请她写
- Greeting
- photo/media outputs scattered by flow

### After

- Home
- 日记墙
  - 今日日记
  - 今日OOTD
  - 今日问候

The wall becomes the canonical surface for daily companion-authored content.

---

## Data Model Direction

The current `Journal` shape should no longer be the only representation of companion daily output.

We need a daily wall model that can hold multiple item types.

### Minimum item taxonomy

- `daily_journal`
- `daily_ootd`
- `daily_greeting`

Each item should support:

- id
- userId
- type
- date
- content payload
- read/view state if relevant
- regeneration metadata if relevant

The journal item may still be persisted into the existing journal store for history and compatibility, but the wall should not be forced to pretend every companion artifact is a normal journal entry.

---

## UX Rules

### Journals

- automatic by default
- refreshable on demand
- not mixed with greeting lines

### OOTD

- short
- visual
- companion-led

### Greeting

- generated in background
- waits for the user
- opens with typewriter reveal

### Language

The product copy should converge on one vocabulary:

- `日记墙`
- `她来记录这一天`
- `今日OOTD`
- `今日问候`

It should stop presenting the system as a bag of separate content generators.

---

## Non-Goals

This redesign does not require:

- a live chat system
- true real-time websocket delivery
- a complex outfit editor
- user-authored journal mode as a primary surface
- merging greetings back into diary preview

---

## Success Criteria

The redesign is successful if:

- users no longer see `我来写` as a standalone mode
- `日记墙` becomes the clear companion content center
- daily journal generation still exists and supports both auto + manual refresh
- OOTD feels like a natural daily artifact from her
- greetings no longer pollute the diary generation preview
- greetings feel alive when opened
- the overall product reads as one companion system rather than multiple stitched-together utilities

---

## Open Implementation Choices

These do not block the redesign direction, but should be resolved during implementation:

- whether `AskHerPage` is renamed or incrementally refactored into `DiaryWallPage`
- whether daily wall items share one table or multiple specialized stores
- whether daily journal refresh overwrites the current item or versions it
- whether OOTD supports manual regenerate on day one
- whether greeting read-state is committed on click or on animation completion

---

## Recommendation

Implement this as a diary-wall-centered redesign, not as incremental copy changes on top of the current split architecture.

That gives the companion one clear product role:

she records, dresses, and greets through the same daily presence system.
