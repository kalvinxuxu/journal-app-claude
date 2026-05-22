import type { CompanionRevealSummary } from "../../types/companion";

const STORAGE_KEY = "journal-app:companionReveal";

export function loadCompanionReveal(): CompanionRevealSummary | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as CompanionRevealSummary : null;
  } catch {
    return null;
  }
}

export function saveCompanionReveal(reveal: CompanionRevealSummary) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reveal));
}

export function clearCompanionReveal() {
  window.localStorage.removeItem(STORAGE_KEY);
}