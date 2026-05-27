import { getBackendUrl } from "../config";
import type { InitialCompanionResult, CompanionRevealSummary } from "../../types/companion";
import type { HomeAvatarPromptRecord, HomeAvatarResultRecord } from "../../types/avatarChoiceLoop";

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

export type OotdItem = {
  id: string;
  userId: string;
  date: string;
  imageUrl: string | null;
  title: string;
  caption: string | null;
  rationale: string | null;
  styleTags: string[];
  cards?: Array<{ id: string; kind: string; imageUrl: string | null; caption: string | null; liked?: boolean }>;
  createdAt: string;
  updatedAt: string;
};

export async function fetchOotdByDate(userId: string, date: string): Promise<OotdItem | null> {
  const response = await fetch(`${getBackendUrl()}/api/companion/ootd/${date}?userId=${userId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`OOTD fetch failed with ${response.status}`);
  }
  const data = await response.json() as { ootd: OotdItem };
  return data.ootd;
}

export async function regenerateOotd(
  userId: string,
  date: string,
  style?: "old_money" | "relaxed_minimal" | "y2k_playful" | "sweet_girly",
): Promise<OotdItem> {
  const response = await fetch(`${getBackendUrl()}/api/companion/ootd/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, date, style }),
  });
  if (!response.ok) {
    throw new Error(`OOTD regenerate failed with ${response.status}`);
  }
  const data = await response.json() as { ootd: OotdItem };
  return data.ootd;
}

export type DailyJournalCheckResult = {
  exists: boolean;
  journalId: string | null;
};

export async function checkDailyJournal(userId: string, date: string): Promise<DailyJournalCheckResult> {
  const response = await fetch(`${getBackendUrl()}/api/companion/daily-journal/check/${date}?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Daily journal check failed with ${response.status}`);
  }
  return response.json() as Promise<DailyJournalCheckResult>;
}

export type GenerateDailyJournalParams = {
  userId: string;
  date: string;
  mood: "开心" | "想念" | "感动" | "平静" | "调皮";
  voiceStyle?: "soft" | "warm" | "playful";
  sceneHint?: string;
  recalledMemory?: string;
};

export type GenerateDailyJournalResult = {
  journal: {
    id: string;
    date: string;
    weekday: string;
    mood: string;
    source: string;
    content: string;
    voiceMessages: Array<{ id: string; timing: string; transcript: string; duration: string }>;
    voiceStyle?: string;
  };
};

export async function generateDailyJournal(params: GenerateDailyJournalParams): Promise<GenerateDailyJournalResult> {
  const response = await fetch(`${getBackendUrl()}/api/companion/daily-journal/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`Daily journal generation failed with ${response.status}`);
  }
  return response.json() as Promise<GenerateDailyJournalResult>;
}

export async function fetchActiveAvatarPrompt(userId: string, now?: string) {
  const search = new URLSearchParams({ userId });
  if (now) search.set("now", now);
  const response = await fetch(`${getBackendUrl()}/api/companion/avatar-prompts/active?${search.toString()}`);
  if (!response.ok) {
    throw new Error(`Avatar prompt fetch failed with ${response.status}`);
  }
  return response.json() as Promise<{ prompt: HomeAvatarPromptRecord | null }>;
}

export async function submitAvatarPromptChoice(payload: {
  userId: string;
  promptId: string;
  selectedOptionId: string;
  now?: string;
}) {
  const response = await fetch(`${getBackendUrl()}/api/companion/avatar-prompts/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Avatar prompt submit failed with ${response.status}`);
  }
  return response.json() as Promise<{ ok: true; acknowledgement: string }>;
}

export async function fetchAvatarPromptResults(userId: string) {
  const response = await fetch(`${getBackendUrl()}/api/companion/avatar-prompts/results?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Avatar prompt results fetch failed with ${response.status}`);
  }
  return response.json() as Promise<{ results: HomeAvatarResultRecord[] }>;
}
