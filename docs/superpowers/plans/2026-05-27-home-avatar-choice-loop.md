# Home Avatar Choice Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a home-page floating avatar interaction loop where the companion asks 2-4 lightweight choice prompts per day, the user answers in place, and the chosen outcome returns later in the diary wall.

**Architecture:** Add a small backend prompt/result subsystem in the existing companion API, then layer a focused `HomeAvatarPrompt` UI onto `HomePage` without adding a new page. Prompt responses create structured result callbacks that the front end can poll and render into the diary wall as companion-authored follow-through items.

**Tech Stack:** React, TypeScript, Vitest, Express, better-sqlite3, existing companion API/client layer, existing diary wall render pipeline.

---

## File Structure

### Backend

- Modify: `backend/src/db/schema.ts`
  - Add SQLite tables for avatar prompts and returned result events.
- Create: `backend/src/companion/types/avatarChoiceLoop.ts`
  - Shared backend types for prompt payloads, response payloads, and returned wall-result records.
- Create: `backend/src/companion/store/avatarPromptStore.ts`
  - CRUD for active prompts, prompt responses, and result-return flags.
- Create: `backend/src/companion/services/avatarPromptService.ts`
  - Prompt scheduling, prompt selection, immediate acknowledgment text, and result payload creation.
- Modify: `backend/src/companion/routes/companionRoutes.ts`
  - Add endpoints for fetching active prompts, submitting a choice, and listing returned result items.
- Modify: `backend/src/companion/routes/companionRoutes.test.ts`
  - Route coverage for prompt fetch, response submission, result-return listing, and relationship gain behavior.

### Frontend

- Create: `src/types/avatarChoiceLoop.ts`
  - Frontend prompt/result types aligned with backend JSON shapes.
- Modify: `src/services/api/companionClient.ts`
  - Add client methods for fetch/respond/list result callbacks.
- Create: `src/components/companion/HomeAvatarPrompt.tsx`
  - Floating avatar, prompt bubble, in-place choice panel, and acknowledgment state.
- Create: `src/components/companion/HomeAvatarPrompt.test.tsx`
  - Unit tests for prompt states and choice submission behavior.
- Modify: `src/pages/HomePage.tsx`
  - Mount avatar prompt UI, poll active prompts, and surface returned results into the home page.
- Modify: `src/pages/HomePage.test.tsx`
  - Home page coverage for avatar bubble, inline choices, and same-page result states.
- Modify: `src/types/diaryWall.ts`
  - Extend renderable union with avatar-choice result items.
- Create: `src/components/diaryWall/AvatarChoiceResultWallItem.tsx`
  - Result item card that explains what the user chose and what she later did.
- Modify: `src/components/diaryWall/WallItemRenderer.tsx`
  - Route the new wall item type.
- Modify: `src/pages/DiaryWallPage.tsx`
  - Merge returned avatar-choice results into the wall feed.
- Modify: `src/pages/DiaryWallPage.test.tsx`
  - Verify returned avatar-choice results render alongside journal/OOTD items.
- Modify: `src/styles/global.css`
  - Floating avatar, bubble, panel, and returned-result card styling.

## Task 1: Add Prompt and Result Persistence

**Files:**
- Modify: `backend/src/db/schema.ts`
- Create: `backend/src/companion/types/avatarChoiceLoop.ts`
- Create: `backend/src/companion/store/avatarPromptStore.ts`
- Test: `backend/src/companion/routes/companionRoutes.test.ts`

- [ ] **Step 1: Write the failing route test for prompt fetch and choice submission**

```ts
it("returns an active avatar prompt and persists the selected choice", async () => {
  const db = new Database(":memory:");
  ensureAppSchema(db);
  db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
    "local-user",
    "2026-05-27T08:00:00.000Z",
    "2026-05-27T08:00:00.000Z",
  );

  const app = express();
  app.use(express.json());
  app.use("/api/companion", createCompanionRoutes(db));

  const activeResponse = await request(app)
    .get("/api/companion/avatar-prompts/active")
    .query({ userId: "local-user", now: "2026-05-27T08:30:00.000Z" });

  expect(activeResponse.status).toBe(200);
  expect(activeResponse.body.prompt.promptType).toBe("outfit_choice");
  expect(activeResponse.body.prompt.options).toHaveLength(3);

  const respondResponse = await request(app)
    .post("/api/companion/avatar-prompts/respond")
    .send({
      userId: "local-user",
      promptId: activeResponse.body.prompt.id,
      selectedOptionId: activeResponse.body.prompt.options[1].id,
      now: "2026-05-27T08:31:00.000Z",
    });

  expect(respondResponse.status).toBe(201);
  expect(respondResponse.body.acknowledgement).toContain("听你的");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/src/companion/routes/companionRoutes.test.ts -t "returns an active avatar prompt and persists the selected choice"`
Expected: FAIL with `Cannot GET /api/companion/avatar-prompts/active` or missing schema/store errors.

- [ ] **Step 3: Add schema, types, and store with the smallest complete shape**

```ts
// backend/src/db/schema.ts
CREATE TABLE IF NOT EXISTS companion_avatar_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  responded_at TEXT,
  selected_option_id TEXT,
  acknowledgement_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS companion_avatar_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  result_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  metadata_json TEXT NOT NULL,
  surfaced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

```ts
// backend/src/companion/types/avatarChoiceLoop.ts
export type AvatarPromptOption = {
  id: string;
  label: string;
  consequenceTag: string;
};

export type AvatarPromptRecord = {
  id: string;
  userId: string;
  promptType: "outfit_choice" | "food_choice" | "outing_choice" | "light_ping";
  promptText: string;
  options: AvatarPromptOption[];
  status: "scheduled" | "active" | "answered" | "returned";
  scheduledFor: string;
  respondedAt: string | null;
  selectedOptionId: string | null;
  acknowledgementText: string | null;
  createdAt: string;
  updatedAt: string;
};
```

```ts
// backend/src/companion/store/avatarPromptStore.ts
export function createAvatarPromptStore(db: Database.Database) {
  return {
    insertPrompt(record: AvatarPromptRecord) {
      db.prepare(`
        INSERT INTO companion_avatar_prompts (
          id, user_id, prompt_type, prompt_text, options_json, status,
          scheduled_for, responded_at, selected_option_id, acknowledgement_text,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.userId,
        record.promptType,
        record.promptText,
        JSON.stringify(record.options),
        record.status,
        record.scheduledFor,
        record.respondedAt,
        record.selectedOptionId,
        record.acknowledgementText,
        record.createdAt,
        record.updatedAt,
      );
    },

    findActivePrompt(userId: string, nowIso: string) {
      const row = db.prepare(`
        SELECT * FROM companion_avatar_prompts
        WHERE user_id = ? AND status IN ('scheduled', 'active') AND scheduled_for <= ?
        ORDER BY scheduled_for ASC
        LIMIT 1
      `).get(userId, nowIso) as any;
      if (!row) return null;
      return {
        id: row.id,
        userId: row.user_id,
        promptType: row.prompt_type,
        promptText: row.prompt_text,
        options: JSON.parse(row.options_json),
        status: row.status,
        scheduledFor: row.scheduled_for,
        respondedAt: row.responded_at,
        selectedOptionId: row.selected_option_id,
        acknowledgementText: row.acknowledgement_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } satisfies AvatarPromptRecord;
    },
  };
}
```

- [ ] **Step 4: Run test to verify the schema/store compiles but routes still fail differently**

Run: `npx vitest run backend/src/companion/routes/companionRoutes.test.ts -t "returns an active avatar prompt and persists the selected choice"`
Expected: FAIL now points to missing route logic instead of missing tables.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/schema.ts backend/src/companion/types/avatarChoiceLoop.ts backend/src/companion/store/avatarPromptStore.ts backend/src/companion/routes/companionRoutes.test.ts
git commit -m "feat: add avatar choice loop persistence primitives"
```

## Task 2: Add Backend Prompt Scheduling and Response Endpoints

**Files:**
- Create: `backend/src/companion/services/avatarPromptService.ts`
- Modify: `backend/src/companion/routes/companionRoutes.ts`
- Modify: `backend/src/companion/routes/companionRoutes.test.ts`

- [ ] **Step 1: Write the failing test for returned result items**

```ts
it("returns a result callback after the user answers a prompt", async () => {
  const db = new Database(":memory:");
  ensureAppSchema(db);
  db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
    "local-user",
    "2026-05-27T08:00:00.000Z",
    "2026-05-27T08:00:00.000Z",
  );

  const app = express();
  app.use(express.json());
  app.use("/api/companion", createCompanionRoutes(db));

  const prompt = await request(app)
    .get("/api/companion/avatar-prompts/active")
    .query({ userId: "local-user", now: "2026-05-27T08:30:00.000Z" });

  await request(app)
    .post("/api/companion/avatar-prompts/respond")
    .send({
      userId: "local-user",
      promptId: prompt.body.prompt.id,
      selectedOptionId: prompt.body.prompt.options[0].id,
      now: "2026-05-27T08:31:00.000Z",
    })
    .expect(201);

  const resultResponse = await request(app)
    .get("/api/companion/avatar-prompts/results")
    .query({ userId: "local-user" });

  expect(resultResponse.status).toBe(200);
  expect(resultResponse.body.results[0].title).toContain("你帮她选的");
  expect(resultResponse.body.results[0].metadata.selectedOptionId).toBe(prompt.body.prompt.options[0].id);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/src/companion/routes/companionRoutes.test.ts -t "returns a result callback after the user answers a prompt"`
Expected: FAIL with `Cannot GET /api/companion/avatar-prompts/results`.

- [ ] **Step 3: Implement prompt scheduling, acknowledgements, response persistence, result creation, and relationship gain**

```ts
// backend/src/companion/services/avatarPromptService.ts
const MORNING_PROMPTS = [
  {
    promptType: "outfit_choice" as const,
    promptText: "今晚要见朋友，我穿哪件比较好呀？",
    options: [
      { id: "white_dress", label: "白裙子", consequenceTag: "soft_gentle" },
      { id: "black_knit", label: "黑色针织", consequenceTag: "calm_polished" },
      { id: "denim_jacket", label: "牛仔外套", consequenceTag: "casual_playful" },
    ],
  },
];

export function createAvatarPromptService(deps: {
  promptStore: ReturnType<typeof createAvatarPromptStore>;
  relationshipStateStore: ReturnType<typeof createRelationshipStateStore>;
}) {
  return {
    getOrCreateActivePrompt(userId: string, nowIso: string) {
      const existing = deps.promptStore.findActivePrompt(userId, nowIso);
      if (existing) return existing;

      const template = MORNING_PROMPTS[0];
      const createdAt = nowIso;
      const prompt: AvatarPromptRecord = {
        id: `avp_${Date.now()}`,
        userId,
        promptType: template.promptType,
        promptText: template.promptText,
        options: template.options,
        status: "active",
        scheduledFor: nowIso,
        respondedAt: null,
        selectedOptionId: null,
        acknowledgementText: null,
        createdAt,
        updatedAt: createdAt,
      };
      deps.promptStore.insertPrompt(prompt);
      return prompt;
    },

    answerPrompt(userId: string, promptId: string, selectedOptionId: string, nowIso: string) {
      const acknowledgementText = "好吧，那我听你的。";
      deps.promptStore.markAnswered({
        userId,
        promptId,
        selectedOptionId,
        acknowledgementText,
        respondedAt: nowIso,
      });

      deps.promptStore.insertResult({
        id: `avr_${Date.now()}`,
        userId,
        promptId,
        resultKind: "avatar_choice_result",
        title: "你帮她选的结果回来了",
        body: "她后来真的按你选的那一项出门了。",
        imageUrl: null,
        metadata: { selectedOptionId },
        surfacedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const relationship = deps.relationshipStateStore.findByUserId(userId);
      if (relationship) {
        deps.relationshipStateStore.upsert({
          ...relationship,
          intimacyScore: relationship.intimacyScore + 1,
          updatedAt: nowIso,
        });
      }

      return { acknowledgementText };
    },
  };
}
```

```ts
// backend/src/companion/routes/companionRoutes.ts
const avatarPromptStore = createAvatarPromptStore(database);
const avatarPromptService = createAvatarPromptService({
  promptStore: avatarPromptStore,
  relationshipStateStore,
});

router.get("/avatar-prompts/active", (req, res) => {
  const userId = String(req.query.userId ?? "");
  const nowIso = String(req.query.now ?? new Date().toISOString());
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const prompt = avatarPromptService.getOrCreateActivePrompt(userId, nowIso);
  res.json({ prompt });
});

router.post("/avatar-prompts/respond", (req, res) => {
  const { userId, promptId, selectedOptionId, now } = req.body as {
    userId?: string;
    promptId?: string;
    selectedOptionId?: string;
    now?: string;
  };
  if (!userId || !promptId || !selectedOptionId) {
    res.status(400).json({ error: "userId, promptId, and selectedOptionId are required" });
    return;
  }
  const result = avatarPromptService.answerPrompt(userId, promptId, selectedOptionId, now ?? new Date().toISOString());
  res.status(201).json({ ok: true, acknowledgement: result.acknowledgementText });
});

router.get("/avatar-prompts/results", (req, res) => {
  const userId = String(req.query.userId ?? "");
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  res.json({ results: avatarPromptStore.listUnsurfacedResults(userId) });
});
```

- [ ] **Step 4: Run the focused backend tests**

Run: `npx vitest run backend/src/companion/routes/companionRoutes.test.ts -t "avatar prompt|result callback"`
Expected: PASS for the two new avatar-choice tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/companion/services/avatarPromptService.ts backend/src/companion/routes/companionRoutes.ts backend/src/companion/routes/companionRoutes.test.ts
git commit -m "feat: add avatar prompt companion endpoints"
```

## Task 3: Add Frontend Types and API Client Support

**Files:**
- Create: `src/types/avatarChoiceLoop.ts`
- Modify: `src/services/api/companionClient.ts`
- Test: `src/components/companion/HomeAvatarPrompt.test.tsx`

- [ ] **Step 1: Write the failing client/UI test for loading and responding to a prompt**

```ts
it("loads an active prompt and submits a selected option", async () => {
  const onResolved = vi.fn();

  render(<HomeAvatarPrompt userId="local-user" onResolved={onResolved} />);

  expect(await screen.findByText("今晚要见朋友，我穿哪件比较好呀？")).toBeDefined();

  await userEvent.click(screen.getByRole("button", { name: "白裙子" }));
  await userEvent.click(screen.getByRole("button", { name: "发送选择" }));

  await waitFor(() => expect(onResolved).toHaveBeenCalledWith(
    expect.objectContaining({
      selectedOptionId: "white_dress",
      acknowledgement: expect.stringContaining("听你的"),
    }),
  ));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/companion/HomeAvatarPrompt.test.tsx -t "loads an active prompt and submits a selected option"`
Expected: FAIL because `HomeAvatarPrompt` and avatar client methods do not exist.

- [ ] **Step 3: Add aligned frontend types and client methods**

```ts
// src/types/avatarChoiceLoop.ts
export type HomeAvatarPromptOption = {
  id: string;
  label: string;
  consequenceTag: string;
};

export type HomeAvatarPromptRecord = {
  id: string;
  promptType: "outfit_choice" | "food_choice" | "outing_choice" | "light_ping";
  promptText: string;
  options: HomeAvatarPromptOption[];
  status: "active" | "answered" | "returned";
  selectedOptionId: string | null;
  acknowledgementText: string | null;
};

export type HomeAvatarResultRecord = {
  id: string;
  promptId: string;
  resultKind: "avatar_choice_result";
  title: string;
  body: string;
  imageUrl: string | null;
  metadata: { selectedOptionId: string };
};
```

```ts
// src/services/api/companionClient.ts
export async function fetchActiveAvatarPrompt(userId: string, now?: string) {
  const search = new URLSearchParams({ userId });
  if (now) search.set("now", now);
  const response = await fetch(`${getBackendUrl()}/api/companion/avatar-prompts/active?${search.toString()}`);
  if (!response.ok) {
    throw new Error(`Avatar prompt fetch failed with ${response.status}`);
  }
  return response.json() as Promise<{ prompt: HomeAvatarPromptRecord | null }>;
}

export async function submitAvatarPromptChoice(payload: {
  userId: string;
  promptId: string;
  selectedOptionId: string;
  now?: string;
}) {
  const response = await fetch(`${getBackendUrl()}/api/companion/avatar-prompts/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Avatar prompt submit failed with ${response.status}`);
  }
  return response.json() as Promise<{ ok: true; acknowledgement: string }>;
}

export async function fetchAvatarPromptResults(userId: string) {
  const response = await fetch(`${getBackendUrl()}/api/companion/avatar-prompts/results?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Avatar prompt results fetch failed with ${response.status}`);
  }
  return response.json() as Promise<{ results: HomeAvatarResultRecord[] }>;
}
```

- [ ] **Step 4: Run the focused test again**

Run: `npx vitest run src/components/companion/HomeAvatarPrompt.test.tsx -t "loads an active prompt and submits a selected option"`
Expected: FAIL now points only to the missing component implementation.

- [ ] **Step 5: Commit**

```bash
git add src/types/avatarChoiceLoop.ts src/services/api/companionClient.ts src/components/companion/HomeAvatarPrompt.test.tsx
git commit -m "feat: add frontend avatar choice loop api bindings"
```

## Task 4: Build the Floating Home Avatar Prompt UI

**Files:**
- Create: `src/components/companion/HomeAvatarPrompt.tsx`
- Create: `src/components/companion/HomeAvatarPrompt.test.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write the failing component test for avatar states**

```ts
it("shows a bubble state first, then opens the in-place chooser panel", async () => {
  render(<HomeAvatarPrompt userId="local-user" onResolved={vi.fn()} />);

  expect(await screen.findByText("今晚要见朋友，我穿哪件比较好呀？")).toBeDefined();

  await userEvent.click(screen.getByRole("button", { name: "打开她的消息" }));

  expect(screen.getByRole("button", { name: "白裙子" })).toBeDefined();
  expect(screen.getByRole("button", { name: "发送选择" })).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/companion/HomeAvatarPrompt.test.tsx -t "shows a bubble state first"`
Expected: FAIL because the component does not exist or does not expose the expected controls.

- [ ] **Step 3: Implement the smallest working floating avatar component**

```tsx
// src/components/companion/HomeAvatarPrompt.tsx
export function HomeAvatarPrompt({
  userId,
  onResolved,
}: {
  userId: string;
  onResolved: (payload: { promptId: string; selectedOptionId: string; acknowledgement: string }) => void;
}) {
  const [prompt, setPrompt] = useState<HomeAvatarPromptRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveAvatarPrompt(userId).then(({ prompt }) => setPrompt(prompt)).catch(() => {});
  }, [userId]);

  async function handleSubmit() {
    if (!prompt || !selectedOptionId) return;
    const result = await submitAvatarPromptChoice({
      userId,
      promptId: prompt.id,
      selectedOptionId,
    });
    setAcknowledgement(result.acknowledgement);
    onResolved({ promptId: prompt.id, selectedOptionId, acknowledgement: result.acknowledgement });
  }

  if (!prompt) return null;

  return (
    <div className="home-avatar-prompt" aria-label="首页女友头像互动">
      <button type="button" className="home-avatar-prompt__avatar" aria-label="打开她的消息" onClick={() => setOpen((value) => !value)}>
        <span className="home-avatar-prompt__dot" />
        <span className="home-avatar-prompt__face">她</span>
      </button>

      {!open ? <div className="home-avatar-prompt__bubble">{prompt.promptText}</div> : null}

      {open ? (
        <div className="home-avatar-prompt__panel">
          <p>{prompt.promptText}</p>
          <div className="home-avatar-prompt__options">
            {prompt.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={selectedOptionId === option.id ? "is-selected" : ""}
                onClick={() => setSelectedOptionId(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleSubmit} disabled={!selectedOptionId}>
            发送选择
          </button>
          {acknowledgement ? <p className="home-avatar-prompt__ack">{acknowledgement}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
```

```css
/* src/styles/global.css */
.home-avatar-prompt {
  position: fixed;
  right: 20px;
  bottom: 88px;
  z-index: 30;
}

.home-avatar-prompt__bubble,
.home-avatar-prompt__panel {
  border-radius: 18px;
  background: #fff7fb;
  box-shadow: 0 14px 32px rgba(120, 78, 102, 0.16);
}
```

- [ ] **Step 4: Run the component tests**

Run: `npx vitest run src/components/companion/HomeAvatarPrompt.test.tsx`
Expected: PASS for bubble, panel, and submit behavior.

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/HomeAvatarPrompt.tsx src/components/companion/HomeAvatarPrompt.test.tsx src/styles/global.css
git commit -m "feat: add floating home avatar prompt ui"
```

## Task 5: Integrate the Avatar Loop Into HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`

- [ ] **Step 1: Write the failing HomePage integration test**

```ts
it("renders the floating avatar prompt on the home page and keeps it in-place", async () => {
  render(
    <HomePage
      journals={[{ id: "j1", date: "2026-05-22", weekday: "周五", mood: "开心", source: "user", content: "第一篇", voiceMessages: [] }]}
      dataSource="local"
      selectedJournalId="j1"
      onSelectJournal={vi.fn()}
      companionReveal={null}
    />,
  );

  expect(await screen.findByLabelText("首页女友头像互动")).toBeDefined();
  expect(screen.queryByText("写日记页")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx -t "renders the floating avatar prompt on the home page"`
Expected: FAIL because `HomePage` does not render the component.

- [ ] **Step 3: Mount the component and merge response state into home-page-local UI**

```tsx
// src/pages/HomePage.tsx
const [latestAvatarResolution, setLatestAvatarResolution] = useState<{
  promptId: string;
  selectedOptionId: string;
  acknowledgement: string;
} | null>(null);

return (
  <section className="page-stack">
    <HomeAvatarPrompt
      userId={userId}
      onResolved={(payload) => {
        setLatestAvatarResolution(payload);
      }}
    />

    {latestAvatarResolution ? (
      <div className="card companion-home-hero">
        <p className="section-label">她刚刚听你的了</p>
        <p className="hero-copy">{latestAvatarResolution.acknowledgement}</p>
      </div>
    ) : null}

    {/* existing home page content */}
  </section>
);
```

- [ ] **Step 4: Run the HomePage tests**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS for existing hero/context tests plus the new avatar integration test.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: mount avatar prompt loop on home page"
```

## Task 6: Return Choice Outcomes Into the Diary Wall

**Files:**
- Modify: `src/types/diaryWall.ts`
- Create: `src/components/diaryWall/AvatarChoiceResultWallItem.tsx`
- Modify: `src/components/diaryWall/WallItemRenderer.tsx`
- Modify: `src/pages/DiaryWallPage.tsx`
- Modify: `src/pages/DiaryWallPage.test.tsx`

- [ ] **Step 1: Write the failing diary wall test for returned avatar-choice items**

```ts
it("renders returned avatar choice results in the wall feed", async () => {
  mockFetchAvatarPromptResults.mockResolvedValue({
    results: [
      {
        id: "avr_1",
        promptId: "avp_1",
        resultKind: "avatar_choice_result",
        title: "你帮她选的结果回来了",
        body: "她最后穿了你选的白裙子，朋友还夸她看起来很温柔。",
        imageUrl: "https://example.com/outfit-result.jpg",
        metadata: { selectedOptionId: "white_dress" },
      },
    ],
  });

  render(<DiaryWallPage todayJournal={null} onJournalRefresh={vi.fn()} onCancel={vi.fn()} />);

  expect(await screen.findByText("你帮她选的结果回来了")).toBeDefined();
  expect(screen.getByText("她最后穿了你选的白裙子，朋友还夸她看起来很温柔。")).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DiaryWallPage.test.tsx -t "renders returned avatar choice results in the wall feed"`
Expected: FAIL because the result type/client fetch/renderer does not exist.

- [ ] **Step 3: Extend wall item types, renderer, and page data loading**

```ts
// src/types/diaryWall.ts
export type DiaryWallRenderableItem =
  | { kind: "journal"; date: string; journal: Journal }
  | { kind: "ootd"; date: string; ootd: OotdItem | null; loading?: boolean; error?: string }
  | { kind: "ootd_card"; date: string; ootd: OotdItem; ootdCard: OotdCard; submitCompanionFeedback: (feedback: { userId: string; journalId?: string; feedbackKind: string; feedbackValue: string }) => void; userId: string }
  | { kind: "avatar_choice_result"; date: string; result: HomeAvatarResultRecord }
  | { kind: "greeting"; date: string; greeting: GreetingCard | null; pending?: boolean };
```

```tsx
// src/components/diaryWall/AvatarChoiceResultWallItem.tsx
export function AvatarChoiceResultWallItem({ result }: { result: HomeAvatarResultRecord }) {
  return (
    <article className="card avatar-choice-result-wall-item">
      <p className="section-label">她后来真的这样做了</p>
      <h3>{result.title}</h3>
      <p>{result.body}</p>
      {result.imageUrl ? <img src={result.imageUrl} alt={result.title} className="ootd-image" /> : null}
    </article>
  );
}
```

```tsx
// src/pages/DiaryWallPage.tsx
const [avatarResults, setAvatarResults] = useState<HomeAvatarResultRecord[]>([]);

useEffect(() => {
  fetchAvatarPromptResults(getCurrentUserId())
    .then((response) => setAvatarResults(response.results))
    .catch(() => {});
}, []);

const items = useMemo<DiaryWallRenderableItem[]>(() => {
  const avatarItems = avatarResults.map((result) => ({
    kind: "avatar_choice_result" as const,
    date: today,
    result,
  }));

  return [...base, ...avatarItems, ...ootdItems];
}, [today, displayedJournal, pendingGreeting, avatarResults, ootd, ootdLoading, ootdError]);
```

- [ ] **Step 4: Run the focused diary wall tests**

Run: `npx vitest run src/pages/DiaryWallPage.test.tsx -t "avatar choice"`
Expected: PASS for the new wall-result test.

- [ ] **Step 5: Commit**

```bash
git add src/types/diaryWall.ts src/components/diaryWall/AvatarChoiceResultWallItem.tsx src/components/diaryWall/WallItemRenderer.tsx src/pages/DiaryWallPage.tsx src/pages/DiaryWallPage.test.tsx
git commit -m "feat: render avatar choice results in diary wall"
```

## Task 7: Finish CSS and Full Focused Verification

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/components/companion/HomeAvatarPrompt.tsx`
- Modify: `src/components/diaryWall/AvatarChoiceResultWallItem.tsx`
- Test: `src/components/companion/HomeAvatarPrompt.test.tsx`
- Test: `src/pages/HomePage.test.tsx`
- Test: `src/pages/DiaryWallPage.test.tsx`
- Test: `backend/src/companion/routes/companionRoutes.test.ts`

- [ ] **Step 1: Add the final failing accessibility and mobile-layout test**

```ts
it("keeps the floating avatar panel usable on narrow screens", async () => {
  window.innerWidth = 390;
  window.dispatchEvent(new Event("resize"));

  render(<HomeAvatarPrompt userId="local-user" onResolved={vi.fn()} />);

  await userEvent.click(await screen.findByRole("button", { name: "打开她的消息" }));

  expect(screen.getByRole("button", { name: "发送选择" })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify the layout gap**

Run: `npx vitest run src/components/companion/HomeAvatarPrompt.test.tsx -t "keeps the floating avatar panel usable on narrow screens"`
Expected: FAIL until the final responsive CSS is in place.

- [ ] **Step 3: Finish CSS polish and verify all focused suites**

```css
/* src/styles/global.css */
.home-avatar-prompt__avatar {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(180deg, #ffe5f1 0%, #ffd6ea 100%);
}

.home-avatar-prompt__panel {
  width: min(320px, calc(100vw - 32px));
  padding: 14px;
}

.home-avatar-prompt__options {
  display: grid;
  gap: 8px;
}

.avatar-choice-result-wall-item {
  overflow: hidden;
}

@media (max-width: 640px) {
  .home-avatar-prompt {
    right: 12px;
    bottom: 76px;
  }
}
```

- [ ] **Step 4: Run the focused verification set**

Run: `npx vitest run backend/src/companion/routes/companionRoutes.test.ts src/components/companion/HomeAvatarPrompt.test.tsx src/pages/HomePage.test.tsx src/pages/DiaryWallPage.test.tsx`
Expected: PASS with new avatar prompt route coverage, component behavior, home-page integration, and returned wall-result rendering.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/components/companion/HomeAvatarPrompt.tsx src/components/diaryWall/AvatarChoiceResultWallItem.tsx src/components/companion/HomeAvatarPrompt.test.tsx src/pages/HomePage.test.tsx src/pages/DiaryWallPage.test.tsx backend/src/companion/routes/companionRoutes.test.ts
git commit -m "feat: polish home avatar choice loop experience"
```
