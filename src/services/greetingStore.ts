export type GreetingTiming = "morning" | "afternoon" | "night";

export interface GreetingCard {
  id: string;
  timing: GreetingTiming;
  content: string;
  audioUrl?: string;
  deliveredAt: string;
  voiceStyle?: "soft" | "warm" | "playful";
  isRead?: boolean;
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
    const updated = [{ ...greeting, isRead: false }, ...current].slice(0, 50);
    saveGreetings(updated);
  },

  getGreetings(): GreetingCard[] {
    return loadGreetings();
  },

  getUnreadGreetings(): GreetingCard[] {
    return loadGreetings().filter(g => !g.isRead);
  },

  getLatestGreeting(): GreetingCard | null {
    const all = loadGreetings();
    return all.length > 0 ? all[0] : null;
  },

  markAsRead(id: string) {
    const current = loadGreetings();
    const updated = current.map(g => g.id === id ? { ...g, isRead: true } : g);
    saveGreetings(updated);
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