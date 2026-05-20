import { randomUUID } from "node:crypto";
import type { GenerationTaskService, CreateTaskRequest, PublicGenerationTask, GenerationTaskRecord } from "./types";

function buildDedupeKey(type: string, input: Record<string, unknown>): string {
  const parts = [type];
  if (input.mood) parts.push(String(input.mood));
  if (input.date) parts.push(String(input.date));
  if (input.voiceStyle) parts.push(String(input.voiceStyle));
  return parts.join(":");
}

function toPublicTask(record: GenerationTaskRecord): PublicGenerationTask {
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    input: record.inputJson ? JSON.parse(record.inputJson) : {},
    output: record.outputJson ? JSON.parse(record.outputJson) : null,
    error: record.errorJson ? JSON.parse(record.errorJson) : null,
    resultSummary: record.resultSummaryJson ? JSON.parse(record.resultSummaryJson) : null,
    retryCount: record.retryCount,
    maxRetries: record.maxRetries,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
  };
}

export function createGenerationTaskService(repository: {
  create(task: GenerationTaskRecord): void;
  getById(id: string): GenerationTaskRecord | null;
  findActiveByDedupeKey(dedupeKey: string): GenerationTaskRecord | null;
  listAvailable(nowIso: string): GenerationTaskRecord[];
  updateStatus(id: string, status: string, nowIso: string): void;
  markRunning(id: string, nowIso: string): void;
  markSucceeded(id: string, output: Record<string, unknown>, resultSummary: Record<string, unknown>, nowIso: string): void;
  markFailed(id: string, error: Record<string, unknown>, nowIso: string): void;
  cancel(id: string, nowIso: string): GenerationTaskRecord | null;
  markStale(id: string, nowIso: string): void;
  findLeaseExpired(nowIso: string): GenerationTaskRecord[];
  listAll(filter: { status?: string; type?: string }): GenerationTaskRecord[];
}): GenerationTaskService {
  return {
    async createTask(request: CreateTaskRequest) {
      const now = new Date().toISOString();
      const dedupeKey = buildDedupeKey(request.type, request.input);
      const existing = repository.findActiveByDedupeKey(dedupeKey);

      if (existing) {
        return { task: toPublicTask(existing), deduped: true };
      }

      const task: GenerationTaskRecord = {
        id: randomUUID(),
        type: request.type,
        status: "queued",
        dedupeKey,
        priority: request.priority ?? 5,
        inputJson: JSON.stringify(request.input),
        outputJson: null,
        errorJson: null,
        resultSummaryJson: null,
        retryCount: 0,
        maxRetries: 3,
        availableAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
      };

      repository.create(task);
      return { task: toPublicTask(task), deduped: false };
    },

    async getTask(id: string) {
      const task = repository.getById(id);
      return task ? toPublicTask(task) : null;
    },

    async listTasks(filter: { status?: string; type?: string }) {
      const records = repository.listAll(filter);
      return records.map(toPublicTask);
    },

    async retryTask(id: string) {
      const now = new Date().toISOString();
      repository.updateStatus(id, "queued", now);
      const task = repository.getById(id);
      if (!task) throw new Error(`Task ${id} not found`);
      return toPublicTask(task);
    },

    async cancelTask(id: string) {
      const task = repository.cancel(id, new Date().toISOString());
      if (!task) throw new Error(`Task ${id} not found`);
      return toPublicTask(task);
    },
  };
}