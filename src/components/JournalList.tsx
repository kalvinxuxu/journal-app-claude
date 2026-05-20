import type { Journal } from "../types/journal";
import { JournalCard } from "./JournalCard";

type JournalListProps = {
  journals: Journal[];
  selectedJournalId: string;
  onSelectJournal: (id: string) => void;
};

export function JournalList({ journals, selectedJournalId, onSelectJournal }: JournalListProps) {
  return (
    <div className="journal-list">
      {journals.map((journal) => (
        <JournalCard
          key={journal.id}
          journal={journal}
          active={journal.id === selectedJournalId}
          onSelect={onSelectJournal}
        />
      ))}
    </div>
  );
}
