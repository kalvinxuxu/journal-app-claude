export type GreetingTiming = "morning" | "afternoon" | "night";

export interface GreetingCard {
  id: string;
  timing: GreetingTiming;
  content: string;
  audioUrl?: string;
  deliveredAt: string;
  voiceStyle?: "soft" | "warm" | "playful";
}

const STORAGE_KEY = "journal-app:greetings";

function loadGreetings(): GreetingCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGreetings(greetings: GreetingCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(greetings));
}

export const greetingStore = {
  addGreeting(greeting: GreetingCard) {
    const current = loadGreetings();
    // Prevent duplicates by id
    if (current.some(g => g.id === greeting.id)) return;
    const updated = [greeting, ...current].slice(0, 50);
    saveGreetings(updated);
  },

  getGreetings(): GreetingCard[] {
    return loadGreetings();
  },

  clearOld() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const filtered = loadGreetings().filter(g => new Date(g.deliveredAt) > oneWeekAgo);
    saveGreetings(filtered);
  },

  getGreetingIds(): Set<string> {
    return new Set(loadGreetings().map(g => g.id));
  },
};