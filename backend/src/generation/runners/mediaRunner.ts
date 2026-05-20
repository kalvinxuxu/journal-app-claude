import type { TaskRunner } from "../types";

export function createMediaRunner(deps: {
  runMedia: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): TaskRunner["run"] {
  return async function runMediaTask(task: { id: string; inputJson: string }) {
    const input = JSON.parse(task.inputJson) as Record<string, unknown>;
    const output = await deps.runMedia(input);
    const hasErrors = Boolean((output as { errors?: Record<string, unknown> }).errors);
    return {
      output,
      resultSummary: { outcome: hasErrors ? "partial_success" : "full_success" },
    };
  };
}