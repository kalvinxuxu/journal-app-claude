import { getBackendUrl } from "../config";
import type { InitialCompanionResult, CompanionRevealSummary } from "../../types/companion";

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
  intake: { entryMode: "real" | "fantasy" };
  userProfileAnswers: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
  companionPreferenceAnswers: Array<{ questionKey: string; answerValue: string; answerWeight?: number }>;
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

export async function persistCompanionRevealPortrait(payload: {
  userId: string;
  portraitImageUrl: string;
}) {
  const response = await fetch(`${getBackendUrl()}/api/companion/onboarding/portrait`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Companion reveal portrait persistence failed with ${response.status}`);
  }
}

export async function saveCompanionCustomName(payload: {
  userId: string;
  customName: string;
}) {
  const response = await fetch(`${getBackendUrl()}/api/companion/onboarding/name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Companion naming failed with ${response.status}`);
  }
}

export async function checkCompanionOnboardingStatus(userId: string) {
  const response = await fetch(`${getBackendUrl()}/api/companion/onboarding/status/${userId}`);
  if (!response.ok) {
    throw new Error(`Companion onboarding status check failed with ${response.status}`);
  }
  return response.json() as Promise<{
    completed: boolean;
    archetype: string | null;
    reveal: CompanionRevealSummary | null;
  }>;
}