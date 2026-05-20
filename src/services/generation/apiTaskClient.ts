const DEFAULT_BACKEND_URL = "http://localhost:3001";

function getBackendUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

export interface FrontendGenerationTask {
  id: string;
  type: "draft_generation" | "media_generation" | "selfie_generation";
  status: "queued" | "leased" | "running" | "succeeded" | "failed" | "cancelled" | "stale";
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: { code: string; message: string; retryable: boolean } | null;
  resultSummary: { outcome: string } | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export async function createGenerationTask(payload: {
  type: "draft_generation" | "media_generation" | "selfie_generation";
  input: Record<string, unknown>;
  priority?: number;
}) {
  const response = await fetch(`${getBackendUrl()}/api/generation/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Task creation failed with ${response.status}`);
  }
  return response.json() as Promise<{ task: FrontendGenerationTask; deduped: boolean }>;
}

export async function getGenerationTask(taskId: string) {
  const response = await fetch(`${getBackendUrl()}/api/generation/tasks/${taskId}`);
  if (!response.ok) {
    throw new Error(`Task fetch failed with ${response.status}`);
  }
  const json = await response.json() as { task: FrontendGenerationTask };
  return json.task;
}

export async function listGenerationTasks(filter?: { status?: string; type?: string }) {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.type) params.set("type", filter.type);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${getBackendUrl()}/api/generation/tasks${query}`);
  if (!response.ok) {
    throw new Error(`Task list failed with ${response.status}`);
  }
  const json = await response.json() as { tasks: FrontendGenerationTask[] };
  return json.tasks;
}

export async function retryGenerationTask(taskId: string) {
  const response = await fetch(`${getBackendUrl()}/api/generation/tasks/${taskId}/retry`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Task retry failed with ${response.status}`);
  }
  const json = await response.json() as { task: FrontendGenerationTask };
  return json.task;
}

export async function cancelGenerationTask(taskId: string) {
  const response = await fetch(`${getBackendUrl()}/api/generation/tasks/${taskId}/cancel`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Task cancel failed with ${response.status}`);
  }
  const json = await response.json() as { task: FrontendGenerationTask };
  return json.task;
}