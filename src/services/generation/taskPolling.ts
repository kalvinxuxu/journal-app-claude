import { getGenerationTask } from "./apiTaskClient";
import { taskStore } from "./taskStore";

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "stale"]);

export async function pollGenerationTask(
  taskId: string,
  pollIntervalMs = 1000,
  timeoutMs = 30_000
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const task = await getGenerationTask(taskId);
    taskStore.upsertTask(task as unknown as Parameters<typeof taskStore.upsertTask>[0]);
    if (TERMINAL.has(task.status)) {
      return task;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return getGenerationTask(taskId);
}