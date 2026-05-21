import { useMemo, useState } from "react";
import type { Journal } from "../types/journal";
import { formatDate } from "../utils/formatDate";
import { EmptyState } from "../components/EmptyState";
import { CalendarGrid } from "../components/CalendarGrid";
import { JournalList } from "../components/JournalList";

type HomePageProps = {
  journals: Journal[];
  dataSource: "local" | "mock" | "empty";
  selectedJournalId: string;
  onSelectJournal: (id: string) => void;
  onCreateNew: () => void;
  onAskHerWrite: () => void;
};

export function HomePage({
  journals,
  dataSource,
  selectedJournalId,
  onSelectJournal,
  onCreateNew,
  onAskHerWrite,
}: HomePageProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const isDev = import.meta.env.DEV;
  const selectedJournal = journals.find((journal) => journal.id === selectedJournalId) ?? journals[0];
  const anchorDate = selectedJournal?.date ?? journals[0]?.date ?? new Date().toISOString();
  const monthTitle = useMemo(() => formatDate(anchorDate).month, [anchorDate]);

  return (
    <section className="page-stack">
      <div className="page-hero card">
        <div>
          <p className="section-label">本月手账</p>
          <h2>{monthTitle}</h2>
          {isDev && (
            <p className="hero-copy" style={{ fontSize: 11, color: "#757575" }}>
              数据来源：
              {dataSource === "mock" && "📋 示例数据"}
              {dataSource === "local" && "💾 本地存储"}
              {dataSource === "empty" && "🗑️ 空数据"}
            </p>
          )}
        </div>

        <div className="hero-actions">
          <button
            type="button"
            className={viewMode === "timeline" ? "toggle-button is-active" : "toggle-button"}
            onClick={() => setViewMode("timeline")}
          >
            卡片流
          </button>
          <button
            type="button"
            className={viewMode === "calendar" ? "toggle-button is-active" : "toggle-button"}
            onClick={() => setViewMode("calendar")}
          >
            月历
          </button>
        </div>
      </div>

      {viewMode === "timeline" ? (
        <JournalList journals={journals} selectedJournalId={selectedJournalId} onSelectJournal={onSelectJournal} />
      ) : (
        <CalendarGrid
          anchorDate={anchorDate}
          journals={journals}
          selectedJournalId={selectedJournalId}
          onSelectJournal={onSelectJournal}
        />
      )}

      {selectedJournal ? (
        <div className="detail-card card">
          <div className="detail-card__top">
            <div>
              <p className="section-label">{formatDate(selectedJournal.date).display}</p>
              <h3>当前选中的日记</h3>
            </div>
          </div>
          <p>{selectedJournal.content}</p>
        </div>
      ) : (
        <EmptyState title="还没有日记" description="先写第一篇吧，首页会立刻有内容。" />
      )}

      <button type="button" className="floating-button" onClick={onCreateNew}>
        ＋
      </button>
    </section>
  );
}
