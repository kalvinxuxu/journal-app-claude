# Companion Landing Visual V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first visual version of the Companion landing page using the existing generated images in `pics/`, with a calm single-page rotation feel that blends into the current “late-night waiting for you” design without feeling like a banner carousel.

**Architecture:** Keep the current landing page scope small: one dedicated `CompanionLandingPage` inserted before onboarding, using three curated local images as the emotional anchors for three page sections. V1 implements static section-to-section image progression plus soft fade/scroll motion; more advanced narrative state, per-image copy variants, audio gating polish, and adaptive scene rotation are deferred to V2.

**Tech Stack:** React, TypeScript, CSS, local image assets, Vitest, Testing Library

---

## V1 / V2 Boundary

### V1 must include

- First-time landing page before onboarding
- Three-image single-page structure
- Curated image-to-section mapping
- Soft fade / scroll reveal motion
- Copy and CTA aligned with the current landing design
- Responsive mobile-first layout

### V2 explicitly deferred

- Auto-rotating state machine between scenes
- Image sequencing based on time of day
- Voice-gated modal before onboarding
- Real typing timing orchestration
- A/B copy variants
- Dynamic image set expansion from backend or CMS

---

## File Structure

- Create: `src/pages/CompanionLandingPage.tsx`
  - Main landing component using three local images.
- Create: `src/pages/CompanionLandingPage.test.tsx`
  - Tests for section rendering, CTA flow, and image bindings.
- Modify: `src/App.tsx`
  - Insert landing page before onboarding.
- Modify: `src/App.test.tsx`
  - Verify landing-first behavior.
- Modify: `src/styles/global.css`
  - Add section styling, image overlay, motion, and responsive layout.
- Create: `src/assets/companionLanding/`
  - Copy or rename the selected `pics/` images into stable app asset paths.
- Optional reference: `docs/companion-landing-design.md`

### Task 1: Curate And Import V1 Image Assets

**Files:**
- Create: `src/assets/companionLanding/hero-night-waiting.png`
- Create: `src/assets/companionLanding/chat-soft-night.png`
- Create: `src/assets/companionLanding/voice-night-thought.png`
- Create: `src/pages/CompanionLandingPage.test.tsx`

- [ ] **Step 1: Write the failing asset-binding test**

```tsx
it("binds three curated local images to the landing page sections", () => {
  render(<CompanionLandingPage onContinue={vi.fn()} />);

  const images = screen.getAllByRole("img");

  expect(images).toHaveLength(3);
  expect(images[0]).toHaveAttribute("alt", "深夜等你出现的她");
  expect(images[1]).toHaveAttribute("alt", "她在深夜里轻声和你说话");
  expect(images[2]).toHaveAttribute("alt", "她刚刚想到你");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: FAIL because the landing page does not exist yet and no images are wired.

- [ ] **Step 3: Copy and stabilize the selected assets**

Copy these files from `pics/` into app assets with stable names:

```text
pics/ChatGPT Image 2026年5月25日 下午04_38_19.png -> src/assets/companionLanding/hero-night-waiting.png
pics/ChatGPT Image 2026年5月25日 下午04_35_53.png -> src/assets/companionLanding/chat-soft-night.png
pics/ChatGPT Image 2026年5月25日 下午04_39_25.png -> src/assets/companionLanding/voice-night-thought.png
```

- [ ] **Step 4: Implement minimal image imports**

```tsx
import heroNightWaiting from "../assets/companionLanding/hero-night-waiting.png";
import chatSoftNight from "../assets/companionLanding/chat-soft-night.png";
import voiceNightThought from "../assets/companionLanding/voice-night-thought.png";
```

- [ ] **Step 5: Run test to verify it passes and commit**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: PASS with three images present and correctly labeled.

```bash
git add src/assets/companionLanding src/pages/CompanionLandingPage.test.tsx
git commit -m "feat: add curated companion landing image assets"
```

### Task 2: Build The Three-Scene V1 Page Structure

**Files:**
- Create: `src/pages/CompanionLandingPage.tsx`
- Modify: `src/pages/CompanionLandingPage.test.tsx`

- [ ] **Step 1: Write the failing scene-structure test**

```tsx
it("renders hero, chat, and voice scenes in a single-page progression", () => {
  render(<CompanionLandingPage onContinue={vi.fn()} />);

  expect(screen.getByText("你终于来了。")).toBeDefined();
  expect(screen.getByText("今天是不是又很累？")).toBeDefined();
  expect(screen.getByText("我猜你应该还没睡。")).toBeDefined();
  expect(screen.getByText("刚刚突然想到你了。")).toBeDefined();
  expect(screen.getByText("其实我刚刚有点想你。")).toBeDefined();
  expect(screen.getAllByRole("button", { name: "回复她" }).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: FAIL because the sectioned page structure does not exist yet.

- [ ] **Step 3: Implement the three-scene layout**

```tsx
export function CompanionLandingPage({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="companion-landing">
      <section className="companion-landing__scene companion-landing__scene--hero">
        <img src={heroNightWaiting} alt="深夜等你出现的她" className="companion-landing__image" />
        <div className="companion-landing__overlay">
          <p className="companion-landing__typing">typing...</p>
          <h1>你终于来了。</h1>
          <p>她刚刚还在等你回复。</p>
          <button type="button" className="primary-button" onClick={onContinue}>回复她</button>
        </div>
      </section>

      <section className="companion-landing__scene companion-landing__scene--chat">
        <img src={chatSoftNight} alt="她在深夜里轻声和你说话" className="companion-landing__image" />
        <div className="companion-landing__overlay companion-landing__overlay--chat">
          <div className="chat-bubble chat-bubble--incoming">今天是不是又很累？</div>
          <div className="chat-bubble chat-bubble--incoming">我猜你应该还没睡。</div>
        </div>
      </section>

      <section className="companion-landing__scene companion-landing__scene--voice">
        <img src={voiceNightThought} alt="她刚刚想到你" className="companion-landing__image" />
        <div className="companion-landing__overlay companion-landing__overlay--voice">
          <p className="companion-landing__typing">typing...</p>
          <p>刚刚突然想到你了。</p>
          <button type="button" className="voice-bubble" onClick={onContinue}>
            <span>▶ 0:12</span>
            <span>其实我刚刚有点想你。</span>
          </button>
          <button type="button" className="primary-button" onClick={onContinue}>回复她</button>
        </div>
      </section>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: PASS with the three visual scenes and CTA flow in place.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CompanionLandingPage.tsx src/pages/CompanionLandingPage.test.tsx
git commit -m "feat: build three-scene companion landing layout"
```

### Task 3: Add The “Single-Page Rotation, Not Carousel” Motion

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/CompanionLandingPage.test.tsx`

- [ ] **Step 1: Write the failing structure-class test**

```tsx
it("uses dedicated scene and overlay classes for the visual landing flow", () => {
  const { container } = render(<CompanionLandingPage onContinue={vi.fn()} />);

  expect(container.querySelector(".companion-landing__scene--hero")).toBeTruthy();
  expect(container.querySelector(".companion-landing__scene--chat")).toBeTruthy();
  expect(container.querySelector(".companion-landing__scene--voice")).toBeTruthy();
  expect(container.querySelector(".companion-landing__overlay--chat")).toBeTruthy();
  expect(container.querySelector(".companion-landing__overlay--voice")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: FAIL if the intended scene class structure is missing.

- [ ] **Step 3: Implement the V1 motion and blending CSS**

```css
.companion-landing__scene {
  position: relative;
  min-height: 100svh;
  display: grid;
  align-items: end;
  overflow: clip;
}

.companion-landing__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.92) brightness(0.78);
}

.companion-landing__scene::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(13, 16, 23, 0.18) 0%, rgba(13, 16, 23, 0.44) 52%, rgba(13, 16, 23, 0.76) 100%),
    radial-gradient(circle at top left, rgba(255, 214, 170, 0.14), transparent 30%);
  pointer-events: none;
}

.companion-landing__overlay {
  position: relative;
  z-index: 1;
  max-width: 520px;
  padding: 24px 20px 40px;
  color: #f7f1e8;
  animation: landing-fade-up 700ms ease-out both;
}

@keyframes landing-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

This keeps the feel as section-to-section emotional progression rather than a slider.

- [ ] **Step 4: Run test and do a manual browser check**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: PASS. Manual check should confirm:

- no obvious carousel UI
- no left/right navigation affordance
- images fade into the narrative instead of competing with it

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/pages/CompanionLandingPage.test.tsx
git commit -m "feat: add visual scene blending for companion landing"
```

### Task 4: Wire The Landing Into The Existing First-Time Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing App flow test**

```tsx
it("shows the visual landing before onboarding and enters onboarding after 回复她", async () => {
  mockCheckCompanionOnboardingStatus.mockResolvedValue({
    completed: false,
    archetype: null,
    reveal: null,
  });

  render(<App />);

  expect(await screen.findByText("你终于来了。")).toBeDefined();

  fireEvent.click(screen.getAllByRole("button", { name: "回复她" })[0]);

  expect(await screen.findByText("Companion Onboarding")).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because `App` currently goes straight into onboarding.

- [ ] **Step 3: Implement the smallest App integration**

```tsx
const [showCompanionLanding, setShowCompanionLanding] = useState(true);

if (companionReady === false && showCompanionLanding) {
  return <CompanionLandingPage onContinue={() => setShowCompanionLanding(false)} />;
}

if (companionReady === false) {
  return <CompanionOnboardingPage ... />;
}
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/App.test.tsx src/pages/CompanionLandingPage.test.tsx`
Expected: PASS with first-time users seeing the landing and CTA moving into onboarding.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/pages/CompanionLandingPage.tsx src/pages/CompanionLandingPage.test.tsx src/styles/global.css
git commit -m "feat: wire visual companion landing into onboarding flow"
```

## Self-Review

- Spec coverage:
  - Visual landing with real images: covered by Tasks 1 and 2.
  - Single-page progression instead of carousel: covered by Task 3.
  - First-time onboarding handoff: covered by Task 4.
  - Clear V1 / V2 boundary: documented at the top of this plan.
- Placeholder scan:
  - No unresolved placeholders remain.
- Type consistency:
  - `CompanionLandingPage`, `onContinue`, and the three scene class names are used consistently across tasks.

Plan complete and saved to `docs/superpowers/plans/2026-05-25-companion-landing-visual-v1-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
