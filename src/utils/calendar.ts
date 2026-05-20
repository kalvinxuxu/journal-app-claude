import type { Journal } from "../types/journal";

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

function toIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type CalendarCell = {
  key: string;
  dateLabel: string;
  day: number | null;
  isCurrentMonth: boolean;
  hasJournal: boolean;
  journalId?: string;
  journalMood?: Journal["mood"];
};

function getJournalByDay(journals: Journal[], year: number, monthIndex: number, day: number) {
  const iso = toIsoDate(year, monthIndex, day);
  return journals.find((journal) => journal.date === iso);
}

export function getCalendarTitle(dateInput: string) {
  const date = new Date(dateInput);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function buildMonthCalendar(anchorDate: string, journals: Journal[]): CalendarCell[] {
  const date = new Date(anchorDate);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();

  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    const prevDate = new Date(year, monthIndex - 1, day);
    cells.push({
      key: `prev-${day}`,
      dateLabel: toIsoDate(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate()),
      day,
      isCurrentMonth: false,
      hasJournal: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const journal = getJournalByDay(journals, year, monthIndex, day);
    cells.push({
      key: `current-${day}`,
      dateLabel: toIsoDate(year, monthIndex, day),
      day,
      isCurrentMonth: true,
      hasJournal: Boolean(journal),
      journalId: journal?.id,
      journalMood: journal?.mood,
    });
  }

  const tailCount = 7 - (cells.length % 7 || 7);
  for (let day = 1; day <= tailCount; day += 1) {
    const nextDate = new Date(year, monthIndex + 1, day);
    cells.push({
      key: `next-${day}`,
      dateLabel: toIsoDate(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()),
      day,
      isCurrentMonth: false,
      hasJournal: false,
    });
  }

  return cells;
}

export function getWeekdayLabel(index: number) {
  return weekdayLabels[index];
}
