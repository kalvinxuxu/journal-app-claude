# Home Avatar Choice Loop Design

## Goal

Increase daily open rate by turning the home-page companion avatar into a lightweight, repeatable, in-place interaction loop.

The interaction should feel like the companion is sending short text-like prompts from the home screen, asking the user to help her make small life choices. The user's choice must visibly affect what she later does, wears, eats, posts, or says.

## Product Intent

This feature is not a daily task card and not a separate chat screen.

It should feel like:

- she appears on the home page
- she asks for help naturally
- the user answers in seconds
- she really follows that choice
- the result returns later in the diary wall

The core retention hook is not completion. It is causality:

- I helped her choose
- she really did that
- she came back with the result

## Scope

This change introduces a new home-page interaction loop centered on the floating avatar.

In scope:

- avatar-based in-place prompt interactions on the home page
- multiple lightweight interactions per day
- A-type prompts with visible downstream outcomes
- C-type prompts with lighter companionship flavor
- result callbacks in the diary wall and related content

Out of scope for this change:

- a dedicated chat page or message inbox
- open-text user replies
- complex branching storylines
- punishment loops such as streak loss or guilt-based nudging
- heavy emotional crisis scenes

## Core Experience

The companion avatar stays suspended on the home page.

When she wants help, the avatar shows a short bubble-like prompt such as:

- "Tonight I'm meeting friends. Which one should I wear?"
- "Lunch is making me indecisive. Pick for me?"
- "Should I tie my hair up or leave it down?"

The user taps the avatar and answers directly on the home page through a compact choice panel.

The interaction should complete in roughly 10-20 seconds per prompt, while the full loop payoff may continue later through wall content.

The user never leaves the home page for this feature.

## Interaction Model

### Home Avatar

The avatar is the only entry point.

Recommended avatar states:

- `idle`
- `new_prompt`
- `awaiting_result`
- `result_returned`

The avatar state should make the companion feel ambient and alive without becoming noisy.

### Prompt Panel

Tapping the avatar expands a small in-place panel on the home page.

Each prompt contains:

- a short question from her
- 2-3 choices, occasionally 4 when needed
- a confirm action
- a short immediate response from her after the user chooses

Example:

- Question: "I'm going to see friends tonight. Which one should I wear?"
- Choices: `white dress` / `black knit` / `denim jacket`
- Immediate response: "Okay, I'll listen to you this time."

### Completion Feeling

The immediate response is important but not sufficient on its own.

The real reward is delayed follow-through:

- she later appears wearing the chosen outfit
- she later posts the meal the user picked
- she later references the choice in a diary-wall update

## Content Strategy

The content mix should be:

- A-type prompts as the main driver
- C-type prompts as the support layer

### A-Type Prompts

These are visible-choice prompts whose outcome can be clearly reflected later.

Priority categories:

1. Outfit and accessory choices
2. Food and drink choices
3. Before-going-out decisions

Examples:

- what to wear
- which earrings or bag
- lunch choice
- whether to bring a jacket
- hair up or down

These prompts should feed later image, caption, and wall content.

### C-Type Prompts

These are lighter companionship prompts that increase visit frequency but do not always require a strong visual outcome.

Examples:

- "Should I get milk tea or coffee?"
- "Do I look cute like this today?"
- "Should I rest first or shower first?"
- "Want me to send you a selfie later?"

These prompts should stay brief and low-pressure.

## Daily Cadence

Recommended daily pacing:

- 2 main A-type prompts per day
- 1-2 lighter C-type prompts per day

All prompts happen through the home avatar.

Recommended rhythm:

- one daytime A-type prompt
- one late afternoon or evening A-type prompt
- one or two lighter prompts inserted between windows

This is intentionally not an unlimited prompt stream.

Too few prompts turns the feature into a daily check-in card.
Too many prompts turns the companion into notification spam.

## Full Loop Example

### Step 1: She asks

Avatar bubble:

- "I'm meeting friends tonight. Which one should I wear?"

Choices:

- `white dress`
- `black knit`
- `denim jacket`

### Step 2: User helps

The user taps the avatar and selects one option.

### Step 3: She acknowledges

She responds immediately with something short and relational, for example:

- "Okay, I'll wear that one."
- "Then don't blame me if I look too pretty."
- "If you picked this one, I might care a little more about looking good."

### Step 4: She follows through

Later, the diary wall receives a result item:

- an image showing the chosen outfit
- a short caption referencing the choice
- a small callback to the user

Example caption:

"I ended up wearing the one you picked. My friend said I looked especially gentle tonight."

Example callback:

"So this time your taste was actually pretty good."

### Step 5: She leaves a small afterglow

An optional later lightweight prompt can continue the feeling:

- "You really picked well today."
- "Next time I go out, I'll ask you again."
- "I secretly took a closer photo too. Want to see it later?"

## Result Mapping

Each answered prompt should create structured downstream influence.

Minimum first-version mapping:

1. Immediate avatar response
2. Result callback in diary wall
3. Light relationship gain

After the base loop is stable, extend to:

4. OOTD caption shaping
5. Journal opening tone adjustment
6. preference memory accumulation

## Content Pools

First-release target pool:

- 12 outfit / accessory / before-going-out prompts
- 6 food / drink prompts
- 6-10 light companionship prompts

This is enough for the first release if the wording stays warm and varied.

## Naming Direction

Do not position this as a task such as "Take care of her today."

It should be framed as ambient, relationship-like contact from the avatar itself.

The primary UX emphasis should be:

- she is hovering on the home page
- she is lightly pinging the user
- the user is helping her decide

The strongest emotional frame is:

- not "complete today's task"
- but "she came to ask me something"

## Constraints

The first release should avoid:

- open text input
- long conversations
- strong guilt or neglect framing
- repeated emotionally heavy scenes
- multi-step branching narratives in a single day

The first release should preserve:

- fast completion
- visible follow-through
- gentle tone
- low pressure

## Success Criteria

The feature is successful if users feel:

- the companion comes to them naturally
- their choices affect her actual behavior
- the home page feels alive across the day
- checking back later is worth it

Leading indicators to watch:

- avatar prompt open rate
- prompt completion rate
- same-day repeat opens
- click-through into returned wall results
- next-day return rate

## Recommended MVP

Release the smallest version that preserves the full causality loop.

MVP:

- floating home avatar with prompt states
- 2 A-type prompts per day
- 1 optional C-type prompt per day
- in-place 2-3 option choice panel
- immediate short acknowledgment
- later wall callback that reflects the chosen result
- light internal relationship gain

This MVP should prioritize believable follow-through over content volume.
