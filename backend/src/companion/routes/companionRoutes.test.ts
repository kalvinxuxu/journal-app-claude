import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { ensureAppSchema } from "../../db/schema";
import { createCompanionRoutes } from "./companionRoutes";

describe("createCompanionRoutes", () => {
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
});
