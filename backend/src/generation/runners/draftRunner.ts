import type { TaskRunner } from "../types";

export function createDraftRunner(deps: {
  generateDraft: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): TaskRunner["run"] {
  return async function runDraftTask(task: { id: string; inputJson: string }) {
    const input = JSON.parse(task.inputJson) as Record<string, unknown>;
    const output = await deps.generateDraft(input);
    return {
      output,
      resultSummary: { outcome: output.source === "fallback" ? "degraded_success" : "full_success" },
    };
  };
}