import type { Journal } from "../types/journal";

function makeTimestamp() {
  return new Date().toISOString();
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function appendText(existing?: string, incoming?: string) {
  const current = existing?.trim() ?? "";
  const next = incoming?.trim() ?? "";
  if (!next) return current;
  if (!current) return next;
  if (current.includes(next)) return current;
  return `${current}\n\n${next}`;
}

export function createJournalEntryId(date: string) {
  return `journal-entry-${date}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDailySummaryId(date: string) {
  return `journal-day-${date}`;
}

export function isDailySummary(journal: Journal) {
  return journal.isDailySummary === true || journal.id === getDailySummaryId(journal.date);
}

export function findDailySummary(journals: Journal[], date: string) {
  return journals.find((journal) => journal.date === date && isDailySummary(journal));
}

export function toJournalEntry(journal: Journal): Journal {
  const createdAt = journal.createdAt ?? makeTimestamp();
  const entryId = journal.id.startsWith("journal-entry-") ? journal.id : createJournalEntryId(journal.date);
  return {
    ...journal,
    id: entryId,
    isDailySummary: false,
    entryIds: undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

export function mergeIntoDailySummary(existing: Journal | undefined, entry: Journal): Journal {
  const createdAt = existing?.createdAt ?? entry.createdAt ?? makeTimestamp();
  const updatedAt = makeTimestamp();
  const dailyId = existing?.id ?? getDailySummaryId(entry.date);

  return {
    ...existing,
    ...entry,
    id: dailyId,
    isDailySummary: true,
    aggregateJournalId: undefined,
    content: appendText(existing?.content, entry.content),
    voiceMessages: [...(existing?.voiceMessages ?? []), ...entry.voiceMessages],
    images: uniq([...(existing?.images ?? []), ...(entry.images ?? [])]),
    selfies: uniq([...(existing?.selfies ?? []), ...(entry.selfies ?? [])]),
    entryIds: uniq([...(existing?.entryIds ?? []), entry.id]),
    nightBonusSelfie: existing?.nightBonusSelfie ?? entry.nightBonusSelfie,
    referenceImage: existing?.referenceImage ?? entry.referenceImage,
    createdAt,
    updatedAt,
  };
}

export function upsertJournalEntryWithDailySummary(journals: Journal[], journal: Journal) {
  const entry = toJournalEntry(journal);
  const summary = mergeIntoDailySummary(findDailySummary(journals, entry.date), entry);

  const next = [
    entry,
    summary,
    ...journals.filter((item) => item.id !== summary.id && item.id !== entry.id),
  ];

  return {
    entry,
    summary,
    journals: next,
  };
}
