import { getBackendUrl } from "../config";
import type { InitialCompanionResult } from "../../types/companion";

export async function submitCompanionFeedback(payload: {
  userId: string;
  journalId?: string;
  feedbackKind: string;
  feedbackValue: string;
}) {
  const response = await fetch(`${getBackendUrl()}/api/companion/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Companion feedback failed with ${response.status}`);
  }
}

export async function fetchCompanionUnlocks(userId: string) {
  const response = await fetch(`${getBackendUrl()}/api/companion/unlocks/${userId}`);
  if (!response.ok) {
    throw new Error(`Companion unlock fetch failed with ${response.status}`);
  }
  return response.json() as Promise<{ unlocks: Array<{ id: string; eventSummary: string }> }>;
}

export async function fetchCompanionContext(userId: string) {
  const response = await fetch(`${getBackendUrl()}/api/companion/context/${userId}`);
  if (!response.ok) {
    throw new Error(`Companion context fetch failed with ${response.status}`);
  }
  return response.json() as Promise<{
    relationshipStage: string;
    recalledMemory: string;
    initiativeScore: number;
  }>;
}

export async function initializeCompanionOnboarding(payload: {
  userId: string;
  answers: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
}) {
  const response = await fetch(`${getBackendUrl()}/api/companion/onboarding/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Companion onboarding failed with ${response.status}`);
  }

  return response.json() as Promise<InitialCompanionResult>;
}
