import type { GenerationTaskRecord } from "./types";
import type { TaskRunner } from "./types";

export interface SchedulerDeps {
  repository: {
    leaseNextAvailable(taskType: string, workerId: string, leaseMs: number, nowIso: string): GenerationTaskRecord | null;
    markRunning(id: string, nowIso: string): void;
    markSucceeded(id: string, output: Record<string, unknown>, resultSummary: Record<string, unknown>, nowIso: string): void;
    markFailed(id: string, error: Record<string, unknown>, nowIso: string): void;
  };
  runners: Record<string, TaskRunner["run"]>;
  concurrency?: Record<string, number>;
  leaseMs: number;
  workerId: string;
}

const DEFAULT_CONCURRENCY = {
  draft_generation: 2,
  media_generation: 1,
  selfie_generation: 1,
} as const;

export function createTaskScheduler({ repository, runners, concurrency = DEFAULT_CONCURRENCY, leaseMs, workerId }: SchedulerDeps) {
  const activeCounts = new Map<string, number>();

  async function tick() {
    for (const [taskType, limit] of Object.entries(concurrency)) {
      const active = activeCounts.get(taskType) ?? 0;
      if (active >= limit) {
        continue;
      }

      const leased = repository.leaseNextAvailable(taskType, workerId, leaseMs, new Date().toISOString());
      if (!leased) {
        continue;
      }

      activeCounts.set(taskType, active + 1);
      try {
        repository.markRunning(leased.id, new Date().toISOString());
        const result = await runners[taskType as keyof typeof runners](leased);
        repository.markSucceeded(leased.id, result.output, result.resultSummary, new Date().toISOString());
      } catch (error) {
        repository.markFailed(leased.id, { message: error instanceof Error ? error.message : String(error) }, new Date().toISOString());
      } finally {
        activeCounts.set(taskType, Math.max(0, (activeCounts.get(taskType) ?? 1) - 1));
      }
    }
  }

  return { tick };
}