# OOTD Dual-Card Selfie and Feedback Design

## Goal

Stabilize OOTD image quality by generating two clearer selfie-oriented outputs per day, and make OOTD interaction meaningful by turning likes into accumulated preference feedback and small relationship gains.

## Scope

This change affects only the OOTD experience in the diary wall:

- One OOTD generation produces two distinct cards.
- Both cards are selfie-oriented instead of generic fashion shots.
- Likes become persistent feedback signals.
- OOTD feedback contributes to relationship progression in a lightweight way.

This change does not introduce a full social feed, comments, or a new account system.

## Product Behavior

### OOTD Structure

Each daily OOTD becomes a pair of cards generated together:

1. `ootd_fullbody_selfie`
   - Full-body selfie
   - Prefer mirror selfie or obvious phone-held self-shot
   - Show full outfit head-to-toe
   - Pose must clearly read as one of:
     - cute
     - sexy
     - elegant

2. `ootd_makeup_closeup`
   - Makeup close-up selfie
   - Same person, same day, same styling continuity
   - Focus on makeup, hair, accessories, and upper-body styling details

These two cards are rendered as two separate wall items, with the full-body selfie first and the makeup close-up second.

### Image Direction

OOTD prompts should be more constrained than today:

- Selfie-first framing, not generic outfit photography
- Mirror selfie allowed and preferred for full-body card
- Stronger “Xiaohongshu fashion blogger” styling language
- Emphasis on outfit coordination, flattering silhouette, and polished styling
- One person only
- Same aspect ratio as journal image generation

### Interaction

Each OOTD card supports lightweight interaction:

- `点赞`
  - Sends feedback to backend
  - Increments a local/persisted liked state for that card
  - Contributes a small relationship gain

- Feedback is cumulative
  - Repeated likes across days become a signal that this style/direction is preferred
  - This signal can later influence prompt shaping

No complex comment UI or social graph is added in this change.

## Data Design

### OOTD Record Shape

The current single-image OOTD payload needs to represent two cards. The backend response should evolve from one image URL to a list of card items under one daily OOTD set.

Suggested shape:

```ts
type OotdCardKind = "fullbody_selfie" | "makeup_closeup";

type OotdCard = {
  id: string;
  kind: OotdCardKind;
  imageUrl: string | null;
  caption: string | null;
  poseTag?: "cute" | "sexy" | "elegant";
  liked?: boolean;
};

type OotdSet = {
  id: string;
  userId: string;
  date: string;
  title: string;
  rationale: string | null;
  styleTags: string[];
  cards: OotdCard[];
  createdAt: string;
  updatedAt: string;
};
```

The storage can use JSON for `cards` initially to keep the schema change small.

### Feedback Mapping

OOTD likes should reuse the existing feedback pipeline with a new feedback kind/value pair rather than creating a brand-new subsystem.

Suggested values:

- `feedbackKind: "ootd_reaction"`
- `feedbackValue: "like_fullbody"` or `"like_makeup"`

Relationship progression should treat OOTD likes as positive feedback counts with a modest weight.

## Prompt Design

### Full-Body Selfie Prompt

Prompt must explicitly include:

- full-body selfie
- mirror selfie or phone-camera self-shot
- entire outfit visible from head to toe
- fashion blogger styling inspired by Xiaohongshu
- one of cute / sexy / elegant pose language
- complete coordination of clothing, shoes, bag, accessories

### Makeup Close-Up Prompt

Prompt must explicitly include:

- close-up selfie
- same girl and same outfit continuity as today’s OOTD
- emphasis on makeup details, hair texture, earrings/jewelry, neckline/top detail
- polished selfie composition, flattering natural light

## UI Design

### Diary Wall

The diary wall should render two independent OOTD cards instead of one merged block.

Each card shows:

- image
- short caption
- like button

Optional small metadata:

- pose tag
- style tags

### Interaction Rules

- A card can be liked once in the UI state for the current rendered item.
- Liking should feel immediate.
- Backend write failures should not break the wall; they can fail softly with a compact error state or silent retry later.

## Error Handling

- If only one image succeeds, still show the successful card and keep the other card as a graceful placeholder.
- If both fail, preserve today’s OOTD shell with a retry affordance.
- If feedback submission fails, keep the UI responsive and avoid blocking browsing.

## Testing

Add targeted tests for:

- OOTD generator returns two cards
- full-body prompt includes selfie and pose constraints
- makeup prompt includes close-up and continuity constraints
- diary wall renders two OOTD items
- liking a card sends feedback payload
- liking contributes to progression input in the lightweight path

## Out of Scope

- Comment threads
- Public sharing
- Ranking multiple likes by different users
- Full recommendation engine for fashion preferences
- Automatic migration to cross-device identity
