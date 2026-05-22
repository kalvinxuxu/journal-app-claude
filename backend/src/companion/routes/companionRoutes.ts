import { Router } from "express";
import { createAppDatabase } from "../../db/database";
import { createCompanionProfileStore } from "../store/companionProfileStore";
import { createRelationshipStateStore } from "../store/relationshipStateStore";
import { createOnboardingAnswerStore } from "../store/onboardingAnswerStore";
import { createOnboardingService } from "../services/onboardingService";

export function createCompanionRoutes() {
  const db = createAppDatabase();
  const router = Router();
  const onboardingService = createOnboardingService({
    onboardingAnswerStore: createOnboardingAnswerStore(db),
    companionProfileStore: createCompanionProfileStore(db),
    relationshipStateStore: createRelationshipStateStore(db),
  });

  router.post("/onboarding/initialize", (req, res) => {
    const { userId, answers } = req.body as {
      userId?: string;
      answers?: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
    };

    if (!userId || !answers || answers.length < 3) {
      res.status(400).json({ error: "userId and at least 3 answers are required" });
      return;
    }

    const result = onboardingService.submitInitialAnswers(userId, answers);
    res.status(201).json(result);
  });

  return router;
}