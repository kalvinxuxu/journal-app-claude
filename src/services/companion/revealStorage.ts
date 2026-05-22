import type { CompanionRevealSummary } from "../../types/companion";

const STORAGE_KEY = "journal-app:companionReveal";

export function saveCompanionReveal(reveal: CompanionRevealSummary) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reveal));
}

export function loadCompanionReveal(): CompanionRevealSummary | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CompanionRevealSummary>;
    if (!parsed.systemDisplayName || !parsed.tagline) return null;
    return {
      customName: null,
      appearanceProfile: {
        hairStyle: "",
        bodyPresence: "",
        fashionAura: "",
        gazeStyle: "",
        poseStyle: "",
      },
      personalityProfile: {
        temperament: "",
        affectionStyle: "",
        distanceStyle: "",
        initiativeStyle: "",
        expressionTone: "",
      },
      ...parsed,
    };
  } catch {
    return null;
  }
}

export function clearCompanionReveal() {
  window.localStorage.removeItem(STORAGE_KEY);
}