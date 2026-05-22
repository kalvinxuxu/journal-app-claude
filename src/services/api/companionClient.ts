import { getBackendUrl } from "../config";
import type { InitialCompanionResult } from "../../types/companion";

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
