import { Router } from "express";
import type { GenerationTaskService } from "../../generation/types.js";
import type { GreetingSettings } from "../../storage/greetingSettings.js";

export function createGreetingRoutes(deps: {
  settingsStore: { get(): GreetingSettings; update(partial: Partial<GreetingSettings>): void };
  taskService: GenerationTaskService;
}) {
  const router = Router();

  // GET /api/greetings/settings
  router.get("/settings", (_req, res) => {
    res.json(deps.settingsStore.get());
  });

  // PUT /api/greetings/settings
  router.put("/settings", (req, res) => {
    const settings = req.body as Partial<GreetingSettings>;
    deps.settingsStore.update(settings);
    res.json(deps.settingsStore.get());
  });

  // GET /api/greetings?status=succeeded
  router.get("/", async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const tasks = await deps.taskService.listTasks({
        status,
        type: "daily_greeting",
      });
      res.json({ greetings: tasks });
    } catch (error) {
      next(error);
    }
  });

  return router;
}