import type { Journal } from "../types/journal";
import { buildMonthCalendar, getCalendarTitle, getWeekdayLabel } from "../utils/calendar";

type CalendarGridProps = {
  anchorDate: string;
  journals: Journal[];
  selectedJournalId: string;
  onSelectJournal: (id: string) => void;
};

export function CalendarGrid({ anchorDate, journals, selectedJournalId, onSelectJournal }: CalendarGridProps) {
  const cells = buildMonthCalendar(anchorDate, journals);
  const selectedJournal = journals.find((journal) => journal.id === selectedJournalId);

  return (
    <section className="calendar card">
      <div className="calendar__header">
        <div>
          <p className="section-label">月历视图</p>
          <h3>{getCalendarTitle(anchorDate)}</h3>
        </div>

        <div className="calendar__legend">
          <span>● 有日记</span>
          {selectedJournal ? <span>当前：{selectedJournal.mood}</span> : null}
        </div>
      </div>

      <div className="calendar__weekdays" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={getWeekdayLabel(index)}>{getWeekdayLabel(index)}</span>
        ))}
      </div>

      <div className="calendar__grid">
        {cells.map((cell) => {
          const isSelected = cell.journalId === selectedJournalId;

          return (
            <button
              key={cell.key}
              type="button"
              className={
                cell.isCurrentMonth
                  ? isSelected
                    ? "calendar__cell is-current is-selected"
                    : "calendar__cell is-current"
                  : "calendar__cell"
              }
              onClick={() => {
                if (cell.journalId) onSelectJournal(cell.journalId);
              }}
              disabled={!cell.journalId}
            >
              <span className="calendar__day">{cell.day}</span>
              {cell.hasJournal ? <span className="calendar__dot" aria-label={`有日记：${cell.journalMood ?? ""}`} /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
