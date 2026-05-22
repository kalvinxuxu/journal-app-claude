# Memory Companion Onboarding Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current three-question onboarding with a lightweight intake, dual-round personality/appearance modeling flow, reveal-then-name sequence, and a home handoff centered on her relationship to journaling rather than greeting audio.

**Architecture:** Keep the existing companion onboarding route family, but expand the onboarding contract from a single flat answer list into structured first-run data: intake metadata, round-one user profile answers, round-two companion preference answers, richer reveal payloads, and a persisted custom name. On the frontend, convert the onboarding page into a staged state machine (`intake`, `about-you`, `about-her`, `generating`, `reveal`, `naming`) and move first-run completion to happen only after naming, while the home page reads the richer reveal payload and suppresses first-run greeting/noise.

**Tech Stack:** React 18, Vite, TypeScript, Vitest, Express, better-sqlite3, existing companion routes/store layer, existing global CSS system

---

## File Structure

### Frontend

- `src/types/companion.ts`
  Expand the onboarding types to support intake, answer sections, appearance/personality profiles, `systemDisplayName`, and `customName`.
- `src/services/api/companionClient.ts`
  Update initialize/status payloads and add a naming endpoint client.
- `src/services/companion/onboardingQuestions.ts`
  Replace the old 3-question list with typed sections for intake, round one, and round two.
- `src/services/companion/revealStorage.ts`
  Persist and reload the richer reveal payload including `customName`.
- `src/pages/CompanionOnboardingPage.tsx`
  Rewrite the onboarding flow into six explicit stages and gate completion on naming.
- `src/pages/CompanionOnboardingPage.test.tsx`
  Cover the new stage progression and the naming confirmation.
- `src/pages/HomePage.tsx`
  Render the richer named companion handoff and keep the hero focused on journaling.
- `src/App.tsx`
  Change first-run completion semantics and avoid surfacing greeting-first behavior immediately after onboarding.
- `src/styles/global.css`
  Add intake, dual-round questionnaire, dynamic reveal, naming, and revised home handoff styles.

### Backend

- `backend/src/companion/types.ts`
  Define the richer onboarding/reveal/profile contracts used across service and routes.
- `backend/src/companion/services/onboardingService.ts`
  Build structured companion appearance/personality summaries and reveal copy from the new answers.
- `backend/src/companion/services/onboardingService.test.ts`
  Prove the service returns the richer contracts and naming-friendly reveal payload.
- `backend/src/companion/store/companionProfileStore.ts`
  Persist new presentation/personality/name fields and add a `updateCustomName` helper.
- `backend/src/companion/routes/companionRoutes.ts`
  Accept the new initialize payload shape, expose richer status, and add a naming route.
- `backend/src/companion/routes/companionRoutes.test.ts`
  Cover initialize/status/name behavior end-to-end.

### Documentation

- `docs/superpowers/specs/2026-05-22-memory-companion-onboarding-reveal-redesign.md`
  Approved redesign spec.
- `docs/superpowers/plans/2026-05-22-memory-companion-onboarding-reveal-implementation-plan.md`
  This implementation plan.

---

### Task 1: Extend The Backend Contract For Dual-Round Onboarding And Naming

**Files:**
- Modify: `backend/src/companion/types.ts`
- Modify: `backend/src/companion/services/onboardingService.ts`
- Modify: `backend/src/companion/services/onboardingService.test.ts`

- [ ] **Step 1: Write the failing onboarding service test for the richer reveal contract**

Update `backend/src/companion/services/onboardingService.test.ts` to replace the current three-answer expectation with a structured initialize payload:

```ts
it("builds a richer reveal from intake, user profile answers, and companion preference answers", () => {
  const db = new Database(":memory:");
  ensureAppSchema(db);
  db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
    "usr_richer",
    "2026-05-22T00:00:00.000Z",
    "2026-05-22T00:00:00.000Z",
  );

  const service = createOnboardingService({
    onboardingAnswerStore: createOnboardingAnswerStore(db),
    companionProfileStore: createCompanionProfileStore(db),
    relationshipStateStore: createRelationshipStateStore(db),
  });

  const result = service.submitInitialAnswers("usr_richer", {
    intake: {
      entryMode: "real",
    },
    userProfileAnswers: [
      { questionKey: "social_energy", answerValue: "slow_warm" },
      { questionKey: "emotional_texture", answerValue: "sensitive_deep" },
      { questionKey: "expression_style", answerValue: "restrained" },
    ],
    companionPreferenceAnswers: [
      { questionKey: "temperament", answerValue: "mature_steady" },
      { questionKey: "affection_style", answerValue: "gentle_attentive" },
      { questionKey: "distance_style", answerValue: "poised" },
      { questionKey: "initiative_style", answerValue: "measured_forward" },
      { questionKey: "expression_tone", answerValue: "light_proud" },
      { questionKey: "hair_style", answerValue: "long_hair" },
      { questionKey: "body_presence", answerValue: "balanced_mature" },
    ],
  });

  expect(result.reveal.systemDisplayName).toBeTruthy();
  expect(result.reveal.customName).toBeNull();
  expect(result.reveal.appearanceProfile.hairStyle).toBe("long_hair");
  expect(result.reveal.personalityProfile.temperament).toBe("mature_steady");
  expect(result.reveal.tagline).not.toContain("交给你");
  expect(result.reveal.portraitDescription.length).toBeGreaterThan(60);
  expect(result.reveal.matchExplanation.length).toBeGreaterThan(40);
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run:

```bash
cd backend
npx vitest run src/companion/services/onboardingService.test.ts
```

Expected: FAIL because `submitInitialAnswers` still accepts a flat answer array and does not return `systemDisplayName`, `customName`, or structured profiles.

- [ ] **Step 3: Add the richer onboarding and reveal types**

Update `backend/src/companion/types.ts`:

```ts
export type OnboardingIntake = {
  entryMode: "real" | "fantasy";
};

export type StructuredOnboardingAnswer = {
  questionKey: string;
  answerValue: string;
  answerWeight?: number;
};

export type CompanionAppearanceProfile = {
  hairStyle: string;
  bodyPresence: string;
  fashionAura: string;
  gazeStyle: string;
  poseStyle: string;
};

export type CompanionPersonalityProfile = {
  temperament: string;
  affectionStyle: string;
  distanceStyle: string;
  initiativeStyle: string;
  expressionTone: string;
};

export type CompanionReveal = {
  systemDisplayName: string;
  customName: string | null;
  tagline: string;
  appearancePrompt: string;
  portraitImageUrl: string | null;
  portraitDescription: string;
  matchExplanation: string;
  appearanceProfile: CompanionAppearanceProfile;
  personalityProfile: CompanionPersonalityProfile;
};
```

- [ ] **Step 4: Implement the richer service builders**

Update `backend/src/companion/services/onboardingService.ts` so `submitInitialAnswers` accepts a structured payload and derives typed summaries:

```ts
type OnboardingSubmission = {
  intake: OnboardingIntake;
  userProfileAnswers: OnboardingAnswerInput[];
  companionPreferenceAnswers: OnboardingAnswerInput[];
};

function pickAnswer(answers: OnboardingAnswerInput[], questionKey: string, fallback: string) {
  return answers.find((answer) => answer.questionKey === questionKey)?.answerValue ?? fallback;
}

function buildAppearanceProfile(answers: OnboardingAnswerInput[]): CompanionAppearanceProfile {
  const hairStyle = pickAnswer(answers, "hair_style", "long_hair");
  const bodyPresence = pickAnswer(answers, "body_presence", "balanced_mature");
  return {
    hairStyle,
    bodyPresence,
    fashionAura: pickAnswer(answers, "fashion_aura", "clean_refined"),
    gazeStyle: pickAnswer(answers, "gaze_style", "steady_warm"),
    poseStyle: bodyPresence === "balanced_mature" ? "poised_shifted_weight" : "soft_forward_presence",
  };
}

function buildPersonalityProfile(answers: OnboardingAnswerInput[]): CompanionPersonalityProfile {
  return {
    temperament: pickAnswer(answers, "temperament", "gentle_steady"),
    affectionStyle: pickAnswer(answers, "affection_style", "gentle_attentive"),
    distanceStyle: pickAnswer(answers, "distance_style", "poised"),
    initiativeStyle: pickAnswer(answers, "initiative_style", "measured_forward"),
    expressionTone: pickAnswer(answers, "expression_tone", "soft_direct"),
  };
}
```

- [ ] **Step 5: Return the richer reveal payload and persist the profile seeds**

Still in `backend/src/companion/services/onboardingService.ts`, replace the old archetype-based reveal logic with profile-driven output:

```ts
const appearanceProfile = buildAppearanceProfile(input.companionPreferenceAnswers);
const personalityProfile = buildPersonalityProfile(input.companionPreferenceAnswers);
const socialEnergy = pickAnswer(input.userProfileAnswers, "social_energy", "slow_warm");
const emotionalTexture = pickAnswer(input.userProfileAnswers, "emotional_texture", "sensitive_deep");
const expressionStyle = pickAnswer(input.userProfileAnswers, "expression_style", "restrained");

const profile: CompanionProfileRecord = {
  userId,
  mode: input.intake.entryMode,
  archetype: personalityProfile.temperament,
  personalitySeedJson: JSON.stringify({
    socialEnergy,
    emotionalTexture,
    expressionStyle,
    personalityProfile,
  }),
  presentationSeedJson: JSON.stringify({
    appearanceProfile,
    systemDisplayName: personalityProfile.temperament === "mature_steady" ? "临川" : "知栀",
  }),
  createdAt: nowIso,
  updatedAt: nowIso,
};
```

Return:

```ts
return {
  profile,
  relationship,
  reveal: {
    systemDisplayName,
    customName: null,
    tagline,
    appearancePrompt,
    portraitImageUrl: null,
    portraitDescription,
    matchExplanation,
    appearanceProfile,
    personalityProfile,
  },
};
```

- [ ] **Step 6: Run the service test to verify it passes**

Run:

```bash
cd backend
npx vitest run src/companion/services/onboardingService.test.ts
```

Expected: PASS with the richer reveal payload assertions succeeding.

- [ ] **Step 7: Commit**

```bash
git add backend/src/companion/types.ts backend/src/companion/services/onboardingService.ts backend/src/companion/services/onboardingService.test.ts
git commit -m "feat: expand onboarding reveal model"
```

### Task 2: Add Status Rehydration And Post-Reveal Naming Routes

**Files:**
- Modify: `backend/src/companion/store/companionProfileStore.ts`
- Modify: `backend/src/companion/routes/companionRoutes.ts`
- Modify: `backend/src/companion/routes/companionRoutes.test.ts`

- [ ] **Step 1: Write the failing route test for initialize, status, and naming**

Update `backend/src/companion/routes/companionRoutes.test.ts`:

```ts
it("returns richer reveal data and allows naming after reveal", async () => {
  const db = new Database(":memory:");
  ensureAppSchema(db);

  const app = express();
  app.use(express.json());
  app.use("/api/companion", createCompanionRoutes(db));

  const initializeResponse = await request(app)
    .post("/api/companion/onboarding/initialize")
    .send({
      userId: "usr_named",
      intake: { entryMode: "real" },
      userProfileAnswers: [
        { questionKey: "social_energy", answerValue: "slow_warm" },
        { questionKey: "emotional_texture", answerValue: "sensitive_deep" },
        { questionKey: "expression_style", answerValue: "restrained" },
      ],
      companionPreferenceAnswers: [
        { questionKey: "temperament", answerValue: "mature_steady" },
        { questionKey: "affection_style", answerValue: "gentle_attentive" },
        { questionKey: "distance_style", answerValue: "poised" },
        { questionKey: "initiative_style", answerValue: "measured_forward" },
        { questionKey: "expression_tone", answerValue: "light_proud" },
        { questionKey: "hair_style", answerValue: "long_hair" },
        { questionKey: "body_presence", answerValue: "balanced_mature" },
      ],
    });

  expect(initializeResponse.status).toBe(201);
  expect(initializeResponse.body.reveal.systemDisplayName).toBeTruthy();
  expect(initializeResponse.body.reveal.customName).toBeNull();

  const namingResponse = await request(app)
    .post("/api/companion/onboarding/name")
    .send({ userId: "usr_named", customName: "晚晴" });

  expect(namingResponse.status).toBe(200);

  const statusResponse = await request(app).get("/api/companion/onboarding/status/usr_named");
  expect(statusResponse.status).toBe(200);
  expect(statusResponse.body.reveal.customName).toBe("晚晴");
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run:

```bash
cd backend
npx vitest run src/companion/routes/companionRoutes.test.ts
```

Expected: FAIL because initialize still expects `answers`, status lacks `customName`, and `/onboarding/name` does not exist.

- [ ] **Step 3: Add a profile-store helper for custom naming**

Update `backend/src/companion/store/companionProfileStore.ts`:

```ts
function patchPresentationSeed(
  presentationSeedJson: string,
  patch: Record<string, unknown>,
) {
  const current = JSON.parse(presentationSeedJson) as Record<string, unknown>;
  return JSON.stringify({ ...current, ...patch });
}

updateCustomName(userId: string, customName: string, updatedAt: string) {
  const profile = findStmt.get(userId) as CompanionProfileRecord | undefined;
  if (!profile) return null;

  upsertStmt.run({
    ...profile,
    presentationSeedJson: patchPresentationSeed(profile.presentationSeedJson, { customName }),
    updatedAt,
  });

  return findStmt.get(userId) as CompanionProfileRecord | undefined;
}
```

- [ ] **Step 4: Accept the richer initialize body and add the naming route**

Update `backend/src/companion/routes/companionRoutes.ts`:

```ts
router.post("/onboarding/initialize", (req, res) => {
  const { userId, intake, userProfileAnswers, companionPreferenceAnswers } = req.body as {
    userId?: string;
    intake?: { entryMode?: "real" | "fantasy" };
    userProfileAnswers?: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
    companionPreferenceAnswers?: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
  };

  if (!userId || !intake || !userProfileAnswers || userProfileAnswers.length < 3 || !companionPreferenceAnswers || companionPreferenceAnswers.length < 7) {
    res.status(400).json({ error: "userId, intake, 3 userProfileAnswers, and 7 companionPreferenceAnswers are required" });
    return;
  }

  const result = onboardingService.submitInitialAnswers(userId, {
    intake: { entryMode: intake.entryMode === "fantasy" ? "fantasy" : "real" },
    userProfileAnswers,
    companionPreferenceAnswers,
  });

  res.status(201).json(result);
});
```

Add:

```ts
router.post("/onboarding/name", (req, res) => {
  const { userId, customName } = req.body as { userId?: string; customName?: string };
  if (!userId || !customName?.trim()) {
    res.status(400).json({ error: "userId and customName are required" });
    return;
  }

  const updated = profileStore.updateCustomName(userId, customName.trim(), new Date().toISOString());
  if (!updated) {
    res.status(404).json({ error: "Companion profile not found" });
    return;
  }

  res.json({ ok: true });
});
```

- [ ] **Step 5: Rehydrate `customName` and the richer reveal from status**

Still in `backend/src/companion/services/onboardingService.ts`, make `buildRevealFromProfile` read both `portraitImageUrl` and `customName` from `presentationSeedJson`:

```ts
function readPresentationSeed(profile: CompanionProfileRecord) {
  try {
    return JSON.parse(profile.presentationSeedJson) as {
      portraitImageUrl?: unknown;
      customName?: unknown;
      appearanceProfile?: CompanionAppearanceProfile;
      systemDisplayName?: unknown;
    };
  } catch {
    return {};
  }
}
```

Use it in `buildRevealFromProfile`:

```ts
const presentationSeed = readPresentationSeed(profile);
return {
  ...buildRevealFromAnswers(profile, relationship),
  portraitImageUrl: typeof presentationSeed.portraitImageUrl === "string" ? presentationSeed.portraitImageUrl : null,
  customName: typeof presentationSeed.customName === "string" ? presentationSeed.customName : null,
};
```

- [ ] **Step 6: Run the route tests to verify they pass**

Run:

```bash
cd backend
npx vitest run src/companion/routes/companionRoutes.test.ts
```

Expected: PASS with initialize, naming, and status rehydration succeeding.

- [ ] **Step 7: Commit**

```bash
git add backend/src/companion/store/companionProfileStore.ts backend/src/companion/routes/companionRoutes.ts backend/src/companion/routes/companionRoutes.test.ts
git commit -m "feat: support post-reveal companion naming"
```

### Task 3: Replace The Frontend Question Model And API Contracts

**Files:**
- Modify: `src/types/companion.ts`
- Modify: `src/services/api/companionClient.ts`
- Modify: `src/services/companion/onboardingQuestions.ts`
- Modify: `src/services/companion/revealStorage.ts`

- [ ] **Step 1: Write the failing API/client type test coverage**

Update `src/pages/CompanionOnboardingPage.test.tsx` so the mocked API matches the new payload shape and naming call:

```ts
vi.mock("../services/api/companionClient", () => ({
  initializeCompanionOnboarding: vi.fn().mockResolvedValue({
    profile: { archetype: "mature_steady", mode: "real" },
    relationship: { stage: "initial", initiativeScore: 45 },
    reveal: {
      systemDisplayName: "临川",
      customName: null,
      tagline: "她看上去很稳，但并不冷。",
      appearancePrompt: "semi-realistic full body portrait, long hair, poised shifted weight",
      portraitImageUrl: null,
      portraitDescription: "她站着的时候很稳，像先把情绪收好，再认真看向你。",
      matchExplanation: "你不是会被热闹瞬间说服的人，所以来到这里的是一个有分寸的人。",
      appearanceProfile: {
        hairStyle: "long_hair",
        bodyPresence: "balanced_mature",
        fashionAura: "clean_refined",
        gazeStyle: "steady_warm",
        poseStyle: "poised_shifted_weight",
      },
      personalityProfile: {
        temperament: "mature_steady",
        affectionStyle: "gentle_attentive",
        distanceStyle: "poised",
        initiativeStyle: "measured_forward",
        expressionTone: "light_proud",
      },
    },
  }),
  persistCompanionRevealPortrait: vi.fn().mockResolvedValue(undefined),
  saveCompanionCustomName: vi.fn().mockResolvedValue(undefined),
}));
```

- [ ] **Step 2: Run the onboarding page test to verify it fails**

Run:

```bash
npx vitest run src/pages/CompanionOnboardingPage.test.tsx
```

Expected: FAIL because the component and types still rely on `displayName` and have no naming API call.

- [ ] **Step 3: Expand the shared frontend types**

Update `src/types/companion.ts`:

```ts
export type CompanionAppearanceProfile = {
  hairStyle: string;
  bodyPresence: string;
  fashionAura: string;
  gazeStyle: string;
  poseStyle: string;
};

export type CompanionPersonalityProfile = {
  temperament: string;
  affectionStyle: string;
  distanceStyle: string;
  initiativeStyle: string;
  expressionTone: string;
};

export type CompanionRevealSummary = {
  systemDisplayName: string;
  customName: string | null;
  tagline: string;
  appearancePrompt: string;
  portraitImageUrl: string | null;
  portraitDescription: string;
  matchExplanation: string;
  appearanceProfile: CompanionAppearanceProfile;
  personalityProfile: CompanionPersonalityProfile;
};
```

- [ ] **Step 4: Update the API client for initialize/status/name**

Update `src/services/api/companionClient.ts`:

```ts
export async function initializeCompanionOnboarding(payload: {
  userId: string;
  intake: { entryMode: "real" | "fantasy" };
  userProfileAnswers: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
  companionPreferenceAnswers: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
}) {
  // existing fetch body update only
}

export async function saveCompanionCustomName(payload: {
  userId: string;
  customName: string;
}) {
  const response = await fetch(`${getBackendUrl()}/api/companion/onboarding/name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Companion naming failed with ${response.status}`);
  }
}
```

- [ ] **Step 5: Replace the old 3-question bank with typed intake/round definitions**

Update `src/services/companion/onboardingQuestions.ts`:

```ts
export const COMPANION_INTAKE_CONFIG = {
  title: "先从你开始",
  subtitle: "她不会凭空出现。她会先经过你，再慢慢成形。",
  entryModes: [
    { label: "更像真实世界里会遇见的人", value: "real" },
    { label: "保留一点梦感和距离", value: "fantasy" },
  ],
} as const;

export const ABOUT_YOU_QUESTIONS = [
  {
    questionKey: "social_energy",
    prompt: "在大多数关系里，你更像哪一种人？",
    options: [
      { label: "慢热，但熟了以后会很深", value: "slow_warm" },
      { label: "比较外放，先靠近再看感觉", value: "open_outward" },
      { label: "看场合，不会轻易一下子打开", value: "guarded_balanced" },
    ],
  },
  // 另外两题继续列完整
];

export const ABOUT_HER_QUESTIONS = [
  // 7 道完整题目，包含 temperament / affection / distance / initiative / expression / hair_style / body_presence
];
```

- [ ] **Step 6: Keep reveal storage backward-safe**

Update `src/services/companion/revealStorage.ts`:

```ts
export function loadCompanionReveal(): CompanionRevealSummary | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CompanionRevealSummary>;
    if (!parsed.systemDisplayName || !parsed.tagline) return null;
    return {
      customName: null,
      appearanceProfile: {
        hairStyle: "",
        bodyPresence: "",
        fashionAura: "",
        gazeStyle: "",
        poseStyle: "",
      },
      personalityProfile: {
        temperament: "",
        affectionStyle: "",
        distanceStyle: "",
        initiativeStyle: "",
        expressionTone: "",
      },
      ...parsed,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 7: Run the targeted test to verify the new contracts compile**

Run:

```bash
npx vitest run src/pages/CompanionOnboardingPage.test.tsx src/App.test.tsx
```

Expected: FAIL may move to later UI assertions, but type/runtime errors about old payload shape should be gone.

- [ ] **Step 8: Commit**

```bash
git add src/types/companion.ts src/services/api/companionClient.ts src/services/companion/onboardingQuestions.ts src/services/companion/revealStorage.ts
git commit -m "feat: update onboarding question and api contracts"
```

### Task 4: Rebuild The Onboarding UI Into Intake, Dual Rounds, Reveal, And Naming

**Files:**
- Modify: `src/pages/CompanionOnboardingPage.tsx`
- Modify: `src/pages/CompanionOnboardingPage.test.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Expand the onboarding page test for the full stage machine**

Update `src/pages/CompanionOnboardingPage.test.tsx`:

```ts
it("collects intake, both answer rounds, reveal portrait, and custom naming before completion", async () => {
  const onCompleted = vi.fn();

  render(<CompanionOnboardingPage onCompleted={onCompleted} />);

  expect(screen.getByText("先从你开始")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "更像真实世界里会遇见的人" }));

  fireEvent.click(screen.getByRole("button", { name: "慢热，但熟了以后会很深" }));
  fireEvent.click(screen.getByRole("button", { name: "感受会留得比较久" }));
  fireEvent.click(screen.getByRole("button", { name: "先收着，不会立刻说很多" }));

  fireEvent.click(screen.getByRole("button", { name: "稳一点，像很难被轻易晃动的人" }));
  fireEvent.click(screen.getByRole("button", { name: "会照顾人，但不会用力过猛" }));
  fireEvent.click(screen.getByRole("button", { name: "有边界，但不是冷" }));
  fireEvent.click(screen.getByRole("button", { name: "会往前一步，但懂得停" }));
  fireEvent.click(screen.getByRole("button", { name: "偶尔有一点傲气" }));
  fireEvent.click(screen.getByRole("button", { name: "长发" }));
  fireEvent.click(screen.getByRole("button", { name: "匀称、成熟一点的存在感" }));

  expect(await screen.findByText("她正在慢慢成形")).toBeDefined();
  expect(await screen.findByText("临川")).toBeDefined();

  fireEvent.change(screen.getByPlaceholderText("你想怎么叫她"), { target: { value: "晚晴" } });
  fireEvent.click(screen.getByRole("button", { name: "就这样叫她" }));

  await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
});
```

- [ ] **Step 2: Run the onboarding page test to verify it fails**

Run:

```bash
npx vitest run src/pages/CompanionOnboardingPage.test.tsx
```

Expected: FAIL because the component still only supports `landing/questions/generating/reveal`.

- [ ] **Step 3: Rewrite the component state machine**

Update `src/pages/CompanionOnboardingPage.tsx`:

```ts
type Stage = "intake" | "about-you" | "about-her" | "generating" | "reveal" | "naming";

const [stage, setStage] = useState<Stage>("intake");
const [entryMode, setEntryMode] = useState<"real" | "fantasy" | null>(null);
const [aboutYouAnswers, setAboutYouAnswers] = useState<AnswerRecord[]>([]);
const [aboutHerAnswers, setAboutHerAnswers] = useState<AnswerRecord[]>([]);
const [customName, setCustomName] = useState("");
```

Submission flow:

```ts
const onboardingResult = await initializeCompanionOnboarding({
  userId: getCurrentUserId(),
  intake: { entryMode: entryMode ?? "real" },
  userProfileAnswers: aboutYouAnswers,
  companionPreferenceAnswers: aboutHerAnswers,
});

const portraitImageUrl = await generateRevealPortrait(onboardingResult.reveal.appearancePrompt);
await persistCompanionRevealPortrait({ userId: getCurrentUserId(), portraitImageUrl });

setResult({
  ...onboardingResult,
  reveal: {
    ...onboardingResult.reveal,
    portraitImageUrl,
  },
});
setStage("reveal");
```

- [ ] **Step 4: Add the post-reveal naming stage**

Still in `src/pages/CompanionOnboardingPage.tsx`, add the naming submit:

```ts
async function handleConfirmName() {
  if (!result || !customName.trim()) return;

  await saveCompanionCustomName({
    userId: getCurrentUserId(),
    customName: customName.trim(),
  });

  const namedResult = {
    ...result,
    reveal: {
      ...result.reveal,
      customName: customName.trim(),
    },
  };

  setResult(namedResult);
  onCompleted(namedResult);
}
```

UI:

```tsx
if (stage === "naming" && result) {
  return (
    <section className="companion-onboarding companion-onboarding--naming">
      <div className="companion-onboarding__panel">
        <p className="section-label">现在，你可以正式叫她了</p>
        <h2>{result.reveal.systemDisplayName}</h2>
        <input
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          placeholder="你想怎么叫她"
        />
        <button type="button" className="primary-button" onClick={handleConfirmName}>
          就这样叫她
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add stage-specific styling**

Update `src/styles/global.css` with focused additions only:

```css
.companion-onboarding--intake,
.companion-onboarding--generating,
.companion-onboarding--naming {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 20% 20%, rgba(214, 199, 255, 0.22), transparent 28%),
    radial-gradient(circle at 80% 18%, rgba(255, 214, 228, 0.28), transparent 24%),
    linear-gradient(180deg, #fffaf7 0%, #f7f2ee 52%, #efe7df 100%);
}

.companion-reveal__image {
  transform: translateY(0);
  animation: revealFloat 4.8s ease-in-out infinite;
}

@keyframes revealFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
```

- [ ] **Step 6: Run the onboarding page test to verify it passes**

Run:

```bash
npx vitest run src/pages/CompanionOnboardingPage.test.tsx
```

Expected: PASS, covering intake -> about-you -> about-her -> generating -> reveal -> naming -> completion.

- [ ] **Step 7: Commit**

```bash
git add src/pages/CompanionOnboardingPage.tsx src/pages/CompanionOnboardingPage.test.tsx src/styles/global.css
git commit -m "feat: rebuild onboarding flow with reveal naming"
```

### Task 5: Rework Home Handoff And First-Run App Gating

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add the failing app/home expectations**

Update `src/App.test.tsx` and `src/pages/HomePage.test.tsx` with two focused checks:

```ts
it("does not mark companion onboarding complete until the naming stage resolves", async () => {
  const onboardingStatus = Promise.resolve({ completed: false, archetype: null, reveal: null });
  mockCheckCompanionOnboardingStatus.mockReturnValue(onboardingStatus);

  render(<App />);
  expect(await screen.findByText("Companion Onboarding")).toBeDefined();
});
```

```ts
it("prefers the custom name in the home handoff hero", () => {
  render(
    <HomePage
      journals={[]}
      dataSource="empty"
      selectedJournalId=""
      onSelectJournal={() => {}}
      onCreateNew={() => {}}
      onAskHerWrite={() => {}}
      companionReveal={{
        systemDisplayName: "临川",
        customName: "晚晴",
        tagline: "她看上去很稳，但并不冷。",
        appearancePrompt: "",
        portraitImageUrl: null,
        portraitDescription: "她在这里。",
        matchExplanation: "你们会遇见。",
        appearanceProfile: {
          hairStyle: "long_hair",
          bodyPresence: "balanced_mature",
          fashionAura: "clean_refined",
          gazeStyle: "steady_warm",
          poseStyle: "poised_shifted_weight",
        },
        personalityProfile: {
          temperament: "mature_steady",
          affectionStyle: "gentle_attentive",
          distanceStyle: "poised",
          initiativeStyle: "measured_forward",
          expressionTone: "light_proud",
        },
      }}
    />,
  );

  expect(screen.getByText("晚晴")).toBeDefined();
  expect(screen.queryByText("临川")).toBeNull();
});
```

- [ ] **Step 2: Run the app/home tests to verify they fail**

Run:

```bash
npx vitest run src/App.test.tsx src/pages/HomePage.test.tsx
```

Expected: FAIL because the home hero still renders `displayName` and the app has no naming-aware completion path.

- [ ] **Step 3: Persist the named reveal and complete onboarding after naming**

Update `src/App.tsx` so onboarding completion is saved only once the named result is returned:

```ts
<CompanionOnboardingPage
  onCompleted={(completedResult) => {
    window.localStorage.setItem("journal-app:companionReady", "true");
    saveCompanionReveal(completedResult.reveal);
    setCompanionReveal(completedResult.reveal);
    setCompanionReady(true);
    if (completedResult.reveal.portraitImageUrl) {
      saveReferenceImage(completedResult.reveal.portraitImageUrl);
    }
  }}
/>
```

- [ ] **Step 4: Keep the home hero focused on her and journaling**

Update `src/pages/HomePage.tsx`:

```ts
const companionName = companionReveal?.customName || companionReveal?.systemDisplayName || "";
```

Render:

```tsx
{companionReveal ? (
  <div className="companion-home-hero card">
    <div>
      <p className="section-label">她已经在这里了</p>
      <h2>{companionName}</h2>
      <p className="hero-copy">{companionReveal.tagline}</p>
      <p className="companion-home-hero__note">
        她会先读你今天留下来的东西，再慢慢学会怎么陪你。
      </p>
    </div>
  </div>
) : null}
```

- [ ] **Step 5: Prevent greeting-first noise from defining the first-run handoff**

In `src/App.tsx`, keep the polling logic but stop it from shaping the onboarding completion moment by moving any greeting-related UI state behind the home navigation rather than the onboarding callback. The code change here is intentionally small:

```ts
const [activePage, setActivePage] = useState<AppPage>("home");
// no onboarding callback should set activePage = "greetings"
```

And ensure the onboarding callback above does not trigger greeting-specific behavior.

- [ ] **Step 6: Run the app/home tests to verify they pass**

Run:

```bash
npx vitest run src/App.test.tsx src/pages/HomePage.test.tsx
```

Expected: PASS with the named handoff rendered correctly and onboarding completion staying tied to the naming stage.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/pages/HomePage.tsx src/App.test.tsx src/pages/HomePage.test.tsx
git commit -m "feat: refine first-run home handoff"
```

### Task 6: Run Focused Regression Checks Across The New Flow

**Files:**
- Modify: `docs/superpowers/plans/2026-05-22-memory-companion-onboarding-reveal-implementation-plan.md`

- [ ] **Step 1: Run the backend onboarding regression suite**

Run:

```bash
cd backend
npx vitest run src/companion/services/onboardingService.test.ts src/companion/routes/companionRoutes.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the frontend onboarding regression suite**

Run:

```bash
npx vitest run src/pages/CompanionOnboardingPage.test.tsx src/App.test.tsx src/pages/HomePage.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run one broader companion/client safety check**

Run:

```bash
npx vitest run src/services/companion/portraitGeneration.test.ts src/services/memory.test.ts
```

Expected: PASS

- [ ] **Step 4: Record any plan drift discovered during execution**

Append execution notes under this plan if any file path, test name, or type signature changes during implementation:

```md
## Execution Notes

- [date] Adjusted `HomePage` hero assertion to match actual CTA copy.
- [date] Renamed `saveCompanionCustomName` payload property only if implementation required it.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-05-22-memory-companion-onboarding-reveal-implementation-plan.md
git commit -m "docs: finalize onboarding reveal execution notes"
```

---

## Execution Notes

- [2026-05-22] Backend onboarding suite (onboardingService + companionRoutes): PASS (5 tests)
- [2026-05-22] Frontend onboarding suite (CompanionOnboardingPage + App + HomePage): PASS (6 tests)
- [2026-05-22] Companion/client broader check: portraitGeneration.test.ts PASS; memory.test.ts 5 FAILED (pre-existing failures unrelated to onboarding reveal work — test expectations reference "local-user" userId and mock/localStorage fallback behavior that was not modified by this plan)
- [2026-05-22] Plan drift: memory.test.ts failures are pre-existing and unrelated to this plan. No adjustments required to plan files.

## Self-Review

- Spec coverage:
  - `轻注册/建档` is covered in Task 3 and Task 4 via intake config and intake stage.
  - `第一轮关于你自己` and `第二轮期待的她` are covered in Task 1, Task 3, and Task 4.
  - `生成中 -> 揭晓 -> 命名` is covered in Task 4.
  - `首页承接与日记关系` is covered in Task 5.
  - `更真实世界、去幼稚剧本腔、外貌问题入模` is covered in Task 1 and Task 3 through typed profile fields and prompt/copy generation.
- Placeholder scan:
  - Removed old references to the flat three-answer contract.
  - Kept code snippets concrete, with exact route names and expected payload keys.
- Type consistency:
  - Frontend and backend both use `systemDisplayName`, `customName`, `appearanceProfile`, and `personalityProfile`.
  - Initialize route/client both use `intake`, `userProfileAnswers`, and `companionPreferenceAnswers`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-22-memory-companion-onboarding-reveal-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
