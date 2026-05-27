import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { ensureAppSchema } from "../../db/schema";
import { createCompanionRoutes } from "./companionRoutes";

describe("createCompanionRoutes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("accepts lightweight feedback and returns unsurfaced unlock events", async () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
      "local-user",
      new Date().toISOString(),
      new Date().toISOString(),
    );

    const app = express();
    app.use(express.json());
    app.use("/api/companion", createCompanionRoutes(db));

    const feedbackResponse = await request(app)
      .post("/api/companion/feedback")
      .send({ userId: "local-user", journalId: "jr_1", feedbackKind: "tone_preference", feedbackValue: "tone_like" });

    expect(feedbackResponse.status).toBe(201);
  });

  it("returns reveal data from initialize and onboarding status", async () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);

    const app = express();
    app.use(express.json());
    app.use("/api/companion", createCompanionRoutes(db));

    const initializeResponse = await request(app)
      .post("/api/companion/onboarding/initialize")
      .send({
        userId: "usr_reveal",
        intake: { entryMode: "fantasy" },
        userProfileAnswers: [
          { questionKey: "social_energy", answerValue: "slow_warm" },
          { questionKey: "emotional_texture", answerValue: "sensitive_deep" },
          { questionKey: "expression_style", answerValue: "restrained" },
        ],
        companionPreferenceAnswers: [
          { questionKey: "temperament", answerValue: "gentle_steady" },
          { questionKey: "affection_style", answerValue: "gentle_attentive" },
          { questionKey: "distance_style", answerValue: "poised" },
          { questionKey: "initiative_style", answerValue: "measured_forward" },
          { questionKey: "expression_tone", answerValue: "soft_direct" },
          { questionKey: "hair_style", answerValue: "long_wavy" },
          { questionKey: "body_presence", answerValue: "balanced_mature" },
        ],
      });

    expect(initializeResponse.status).toBe(201);
    expect(initializeResponse.body.reveal.systemDisplayName).toBeTruthy();

    const statusResponse = await request(app).get("/api/companion/onboarding/status/usr_reveal");

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.completed).toBe(true);
    expect(statusResponse.body.reveal.systemDisplayName).toBe(initializeResponse.body.reveal.systemDisplayName);
  });

  it("persists the reveal portrait url and returns it from onboarding status", async () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);

    const app = express();
    app.use(express.json());
    app.use("/api/companion", createCompanionRoutes(db));

    await request(app)
      .post("/api/companion/onboarding/initialize")
      .send({
        userId: "usr_portrait",
        intake: { entryMode: "real" },
        userProfileAnswers: [
          { questionKey: "social_energy", answerValue: "slow_warm" },
          { questionKey: "emotional_texture", answerValue: "sensitive_deep" },
          { questionKey: "expression_style", answerValue: "restrained" },
        ],
        companionPreferenceAnswers: [
          { questionKey: "temperament", answerValue: "gentle_steady" },
          { questionKey: "affection_style", answerValue: "gentle_attentive" },
          { questionKey: "distance_style", answerValue: "poised" },
          { questionKey: "initiative_style", answerValue: "measured_forward" },
          { questionKey: "expression_tone", answerValue: "soft_direct" },
          { questionKey: "hair_style", answerValue: "long_wavy" },
          { questionKey: "body_presence", answerValue: "balanced_mature" },
        ],
      })
      .expect(201);

    const persistResponse = await request(app)
      .post("/api/companion/onboarding/portrait")
      .send({
        userId: "usr_portrait",
        portraitImageUrl: "http://localhost:3001/media/images/reveal-portrait.jpg",
      });

    expect(persistResponse.status).toBe(200);

    const statusResponse = await request(app).get("/api/companion/onboarding/status/usr_portrait");

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.reveal.portraitImageUrl).toBe(
      "http://localhost:3001/media/images/reveal-portrait.jpg",
    );
  });

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

  it("passes the reveal portrait as subject_reference for OOTD generation", async () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);

    const fetchMock = vi.fn(async () => ({
      json: async () => ({ data: { image_urls: ["https://example.com/ootd.jpg"] } }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const app = express();
    app.use(express.json());
    app.use("/api/companion", createCompanionRoutes(db));

    await request(app)
      .post("/api/companion/onboarding/initialize")
      .send({
        userId: "usr_ootd_ref",
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
      })
      .expect(201);

    await request(app)
      .post("/api/companion/onboarding/portrait")
      .send({
        userId: "usr_ootd_ref",
        portraitImageUrl: "https://example.com/reveal-portrait.jpg",
      })
      .expect(200);

    await request(app)
      .get("/api/companion/ootd/2026-05-23")
      .query({ userId: "usr_ootd_ref" })
      .expect(200);

    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined;
    const requestInit = firstCall?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body)) as {
      subject_reference?: Array<{ type: string; image_file: string }>;
    };

    expect(body.subject_reference?.[0]).toEqual({
      type: "character",
      image_file: "https://example.com/reveal-portrait.jpg",
    });
  });

  it("passes a one-off OOTD style override to image generation", async () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);

    const fetchMock = vi.fn(async () => ({
      json: async () => ({ data: { image_urls: ["https://example.com/ootd.jpg"] } }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const app = express();
    app.use(express.json());
    app.use("/api/companion", createCompanionRoutes(db));

    await request(app)
      .post("/api/companion/ootd/regenerate")
      .send({ userId: "usr_ootd_style", date: "2026-05-24", style: "sweet_girly" })
      .expect(201);

    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined;
    const requestInit = firstCall?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body)) as { prompt?: string };

    expect(body.prompt).toContain("sweet, pretty, softly feminine styling");
  });

  it("accepts ootd like feedback for a specific card", async () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
      "local-user",
      new Date().toISOString(),
      new Date().toISOString(),
    );

    const app = express();
    app.use(express.json());
    app.use("/api/companion", createCompanionRoutes(db));

    const response = await request(app)
      .post("/api/companion/feedback")
      .send({
        userId: "local-user",
        journalId: "ootd_1",
        feedbackKind: "ootd_reaction",
        feedbackValue: "like_fullbody",
      });

    expect(response.status).toBe(201);
  });

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

  it("advances relationship when ootd_reaction feedback is posted", async () => {
    const db = new Database(":memory:");
    ensureAppSchema(db);
    const now = new Date().toISOString();

    // Insert user
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
      "ootd-user",
      now,
      now,
    );

    // Insert a relationship state for the user
    db.prepare(`
      INSERT INTO relationship_states (
        user_id, stage, intimacy_score, initiative_score, recall_score,
        boundary_fit_score, style_alignment_score, last_calibrated_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "ootd-user",
      "acquaintance",
      30,
      30,
      20,
      50,
      40,
      null,
      now,
      now,
    );

    const advanceRelationshipMock = vi.fn(() => ({
      userId: "ootd-user",
      stage: "familiar",
      intimacyScore: 31,
      initiativeScore: 30,
      recallScore: 20,
      boundaryFitScore: 50,
      styleAlignmentScore: 44,
      lastCalibratedAt: null,
      createdAt: now,
      updatedAt: now,
    }));

    const journalPostProcessor = {
      process: vi.fn(),
    };

    const app = express();
    app.use(express.json());
    app.use("/api/companion", createCompanionRoutes(db, { journalPostProcessor }));

    const response = await request(app)
      .post("/api/companion/feedback")
      .send({
        userId: "ootd-user",
        journalId: "ootd_1",
        feedbackKind: "ootd_reaction",
        feedbackValue: "like_fullbody",
      });

    expect(response.status).toBe(201);
    expect(journalPostProcessor.process).toHaveBeenCalledTimes(1);
    expect(journalPostProcessor.process).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "ootd-user",
        ootdLikeCount: 1,
      }),
    );
  });
});
