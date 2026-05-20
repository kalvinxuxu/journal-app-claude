export type GenerationTaskType = "draft_generation" | "media_generation" | "selfie_generation";

export type GenerationTaskStatus =
  | "queued"
  | "leased"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "stale";

export interface GenerationTaskRecord {
  id: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  dedupeKey: string;
  priority: number;
  inputJson: string;
  outputJson: string | null;
  errorJson: string | null;
  resultSummaryJson: string | null;
  retryCount: number;
  maxRetries: number;
  availableAt: string;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface CreateTaskRequest {
  type: "draft_generation" | "media_generation" | "selfie_generation";
  input: Record<string, unknown>;
  priority?: number;
}

export interface CreateTaskResult {
  task: PublicGenerationTask;
  deduped: boolean;
}

export interface PublicGenerationTask {
  id: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: TaskError | null;
  resultSummary: TaskResultSummary | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TaskError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface TaskResultSummary {
  outcome: "full_success" | "partial_success" | "degraded_success" | "failed";
}

export interface GenerationTaskService {
  createTask(input: CreateTaskRequest): Promise<CreateTaskResult>;
  getTask(id: string): Promise<PublicGenerationTask | null>;
  listTasks(filter: { status?: string; type?: string }): Promise<PublicGenerationTask[]>;
  retryTask(id: string): Promise<PublicGenerationTask>;
  cancelTask(id: string): Promise<PublicGenerationTask>;
}

export interface TaskRunner {
  run(task: { id: string; inputJson: string }): Promise<{ output: Record<string, unknown>; resultSummary: { outcome: string } }>;
}