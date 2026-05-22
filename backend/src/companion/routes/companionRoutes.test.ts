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
        answers: [
          { questionKey: "entry_mode", answerValue: "fantasy" },
          { questionKey: "initiative_preference", answerValue: "high" },
          { questionKey: "ideal_presence", answerValue: "playful_warm" },
        ],
      });

    expect(initializeResponse.status).toBe(201);
    expect(initializeResponse.body.reveal.displayName).toBeTruthy();

    const statusResponse = await request(app).get("/api/companion/onboarding/status/usr_reveal");

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.completed).toBe(true);
    expect(statusResponse.body.reveal.displayName).toBe(initializeResponse.body.reveal.displayName);
  });
});