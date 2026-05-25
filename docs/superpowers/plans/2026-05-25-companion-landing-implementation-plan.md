# Companion Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-time Companion landing page that shifts the user into a “late-night waiting for you” emotional state before entering onboarding.

**Architecture:** Insert a dedicated `CompanionLandingPage` into the existing `companionReady === false` path in `App.tsx`, keeping onboarding logic unchanged after the user taps the CTA. Build the page as a focused React page with scroll-based message sections, soft motion, and static content tuned to this project’s Companion positioning rather than a generic marketing page.

**Tech Stack:** React, TypeScript, CSS, Vitest, Testing Library

---

## File Structure

- Create: `src/pages/CompanionLandingPage.tsx`
  - Page component for the late-night emotional entry experience.
- Create: `src/pages/CompanionLandingPage.test.tsx`
  - Focused tests for CTA, content, and staged reveal basics.
- Modify: `src/App.tsx`
  - Route first-time users to the landing page before onboarding.
- Modify: `src/styles/global.css`
  - Add landing-specific styles, motion, and responsive layout.
- Optional reference only: `docs/companion-landing-design.md`
  - Use as the design source of truth.

### Task 1: Insert Landing Page Into First-Time Companion Flow

**Files:**
- Create: `src/pages/CompanionLandingPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/pages/CompanionLandingPage.test.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing App test for landing-first behavior**

```tsx
it("shows the companion landing page before onboarding when companion is not ready", async () => {
  mockCheckCompanionOnboardingStatus.mockResolvedValue({
    completed: false,
    archetype: null,
    reveal: null,
  });

  render(<App />);

  expect(await screen.findByText("你终于来了。")).toBeDefined();
  expect(screen.queryByText("Companion Onboarding")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because `App` currently renders `CompanionOnboardingPage` immediately when `companionReady === false`.

- [ ] **Step 3: Write the failing landing page CTA test**

```tsx
it("calls onContinue when the user clicks 回复她", () => {
  const onContinue = vi.fn();

  render(<CompanionLandingPage onContinue={onContinue} />);

  fireEvent.click(screen.getByRole("button", { name: "回复她" }));

  expect(onContinue).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 4: Implement minimal landing page insertion**

```tsx
export function CompanionLandingPage({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="companion-landing">
      <div className="companion-landing__hero">
        <p className="companion-landing__typing">typing...</p>
        <h1>你终于来了。</h1>
        <p>她刚刚还在等你回复。</p>
        <button type="button" className="primary-button" onClick={onContinue}>
          回复她
        </button>
      </div>
    </section>
  );
}
```

```tsx
const [showCompanionLanding, setShowCompanionLanding] = useState(true);

if (companionReady === false && showCompanionLanding) {
  return <CompanionLandingPage onContinue={() => setShowCompanionLanding(false)} />;
}

if (companionReady === false) {
  return <CompanionOnboardingPage ... />;
}
```

- [ ] **Step 5: Run targeted tests and commit**

Run: `npm test -- src/App.test.tsx src/pages/CompanionLandingPage.test.tsx`
Expected: PASS with landing page shown first and CTA entering onboarding.

```bash
git add src/App.tsx src/App.test.tsx src/pages/CompanionLandingPage.tsx src/pages/CompanionLandingPage.test.tsx
git commit -m "feat: add companion landing entry page"
```

### Task 2: Build The Emotional Landing Structure

**Files:**
- Modify: `src/pages/CompanionLandingPage.tsx`
- Test: `src/pages/CompanionLandingPage.test.tsx`

- [ ] **Step 1: Write the failing content-structure test**

```tsx
it("renders the late-night emotional sections for first contact", () => {
  render(<CompanionLandingPage onContinue={vi.fn()} />);

  expect(screen.getByText("你终于来了。")).toBeDefined();
  expect(screen.getByText("今天是不是又很累？")).toBeDefined();
  expect(screen.getByText("我猜你应该还没睡。")).toBeDefined();
  expect(screen.getByText("外面突然下雨了。")).toBeDefined();
  expect(screen.getByText("刚刚突然想到你了。")).toBeDefined();
  expect(screen.getByText("其实我刚刚有点想你。")).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: FAIL because the landing page only contains a minimal hero and CTA.

- [ ] **Step 3: Implement the full section structure**

```tsx
export function CompanionLandingPage({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="companion-landing">
      <div className="companion-landing__hero">
        <div className="companion-landing__visual" aria-hidden="true" />
        <div className="companion-landing__message-block">
          <p className="companion-landing__typing">typing...</p>
          <h1>你终于来了。</h1>
          <p className="companion-landing__subcopy">她刚刚还在等你回复。</p>
        </div>
      </div>

      <section className="companion-landing__chat">
        <div className="chat-bubble chat-bubble--incoming">今天是不是又很累？</div>
        <div className="chat-bubble chat-bubble--incoming">我猜你应该还没睡。</div>
      </section>

      <section className="companion-landing__moments">
        <article className="moment-card"><span>外面突然下雨了。</span></article>
        <article className="moment-card"><span>还在工作。</span></article>
        <article className="moment-card"><span>你怎么还不睡。</span></article>
      </section>

      <section className="companion-landing__thinking">
        <p className="companion-landing__typing">typing...</p>
        <p>刚刚突然想到你了。</p>
      </section>

      <section className="companion-landing__voice">
        <button type="button" className="voice-bubble" onClick={onContinue}>
          <span>▶ 0:12</span>
          <span>其实我刚刚有点想你。</span>
        </button>
      </section>

      <section className="companion-landing__cta">
        <button type="button" className="primary-button" onClick={onContinue}>回复她</button>
      </section>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: PASS with all emotional sections rendered.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CompanionLandingPage.tsx src/pages/CompanionLandingPage.test.tsx
git commit -m "feat: build emotional companion landing structure"
```

### Task 3: Apply Project-Specific Visual Language And Motion

**Files:**
- Modify: `src/styles/global.css`
- Test: `src/pages/CompanionLandingPage.test.tsx`

- [ ] **Step 1: Write the failing visual-class test**

```tsx
it("uses dedicated landing classes for hero, chat, moments, thinking, and voice sections", () => {
  const { container } = render(<CompanionLandingPage onContinue={vi.fn()} />);

  expect(container.querySelector(".companion-landing__hero")).toBeTruthy();
  expect(container.querySelector(".companion-landing__chat")).toBeTruthy();
  expect(container.querySelector(".companion-landing__moments")).toBeTruthy();
  expect(container.querySelector(".companion-landing__thinking")).toBeTruthy();
  expect(container.querySelector(".companion-landing__voice")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: FAIL if all target structure classes are not yet in place.

- [ ] **Step 3: Implement minimal but project-fit CSS**

```css
.companion-landing {
  min-height: 100vh;
  padding: 24px 20px 56px;
  background:
    radial-gradient(circle at top, rgba(255, 224, 188, 0.18), transparent 36%),
    linear-gradient(180deg, #141821 0%, #1d2330 42%, #f5efe7 100%);
  color: #f7f1e8;
}

.companion-landing__hero,
.companion-landing__chat,
.companion-landing__moments,
.companion-landing__thinking,
.companion-landing__voice,
.companion-landing__cta {
  max-width: 760px;
  margin: 0 auto 28px;
}

.companion-landing__typing {
  opacity: 0.72;
  letter-spacing: 0.18em;
  text-transform: lowercase;
  animation: landing-breathe 2.8s ease-in-out infinite;
}

@keyframes landing-breathe {
  0%, 100% { opacity: 0.45; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/CompanionLandingPage.test.tsx`
Expected: PASS and manual browser check shows warm, quiet, late-night page tone.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/pages/CompanionLandingPage.test.tsx
git commit -m "feat: style companion landing with late-night mood"
```

### Task 4: Verify Integration In The Real App Flow

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/pages/CompanionLandingPage.test.tsx`

- [ ] **Step 1: Write the failing integration test for CTA transition**

```tsx
it("moves from landing into onboarding after the user clicks 回复她", async () => {
  mockCheckCompanionOnboardingStatus.mockResolvedValue({
    completed: false,
    archetype: null,
    reveal: null,
  });

  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: "回复她" }));

  expect(await screen.findByText("Companion Onboarding")).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL if CTA does not correctly transition into onboarding.

- [ ] **Step 3: Implement any missing state handoff fixes**

```tsx
const [showCompanionLanding, setShowCompanionLanding] = useState(true);

useEffect(() => {
  if (companionReady === true) {
    setShowCompanionLanding(false);
  }
}, [companionReady]);
```

Use the smallest state fix needed so that:

- first-time users see landing first
- CTA leads to onboarding
- completed users never see landing again

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/App.test.tsx src/pages/CompanionLandingPage.test.tsx`
Expected: PASS with correct flow and CTA transition.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/pages/CompanionLandingPage.tsx src/pages/CompanionLandingPage.test.tsx
git commit -m "fix: wire companion landing into onboarding flow"
```

## Self-Review

- Spec coverage:
  - Late-night emotional positioning: covered by Tasks 2 and 3.
  - First-time companion entry integration: covered by Tasks 1 and 4.
  - CTA-driven handoff into onboarding: covered by Tasks 1 and 4.
  - Voice-triggered emotional conversion point: covered by Task 2.
- Placeholder scan:
  - No placeholder steps or unspecified file edits remain.
- Type consistency:
  - `CompanionLandingPage`, `onContinue`, and `showCompanionLanding` are used consistently across tasks.

Plan complete and saved to `docs/superpowers/plans/2026-05-25-companion-landing-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
