import { Router } from "express";
import type { GenerationTaskService } from "../types";

export function createGenerationRoutes(service: GenerationTaskService) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const result = await service.createTask(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const task = await service.getTask(req.params.id);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const tasks = await service.listTasks({
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        type: typeof req.query.type === "string" ? req.query.type : undefined,
      });
      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/retry", async (req, res, next) => {
    try {
      const task = await service.retryTask(req.params.id);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/cancel", async (req, res, next) => {
    try {
      const task = await service.cancelTask(req.params.id);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  return router;
}