import type { Journal, Mood } from "../types/journal";

export type PhotoWallItem = {
  id: string;
  journalId: string;
  date: string;
  mood: Mood;
  kind: "image" | "selfie" | "nightBonus";
  src: string;
};

export function buildPhotoWallItems(journals: Journal[]): PhotoWallItem[] {
  return journals.flatMap((journal) => {
    const imageItems = (journal.images ?? []).map((src, index) => ({
      id: `${journal.id}-image-${index}`,
      journalId: journal.id,
      date: journal.date,
      mood: journal.mood,
      kind: "image" as const,
      src,
    }));

    const selfieItems = (journal.selfies ?? []).map((src, index) => ({
      id: `${journal.id}-selfie-${index}`,
      journalId: journal.id,
      date: journal.date,
      mood: journal.mood,
      kind: "selfie" as const,
      src,
    }));

    const nightBonusItems = journal.nightBonusSelfie
      ? [{
          id: `${journal.id}-night-bonus`,
          journalId: journal.id,
          date: journal.date,
          mood: journal.mood,
          kind: "nightBonus" as const,
          src: journal.nightBonusSelfie,
        }]
      : [];

    return [...imageItems, ...selfieItems, ...nightBonusItems];
  });
}