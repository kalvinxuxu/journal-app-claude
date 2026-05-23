import { useMemo, useState, useEffect } from "react";
import type { Journal } from "../types/journal";
import type { CompanionRevealSummary } from "../types/companion";
import { formatDate } from "../utils/formatDate";
import { EmptyState } from "../components/EmptyState";
import { CalendarGrid } from "../components/CalendarGrid";
import { JournalList } from "../components/JournalList";
import { CompanionEchoCard } from "../components/companion/CompanionEchoCard";
import { fetchCompanionUnlocks, fetchCompanionContext } from "../services/api/companionClient";
import { getCurrentUserId } from "../services/memory";

type HomePageProps = {
  journals: Journal[];
  dataSource: "local" | "mock" | "empty";
  selectedJournalId: string;
  onSelectJournal: (id: string) => void;
  onAskHerWrite: () => void;
  companionReveal: CompanionRevealSummary | null;
};

export function HomePage({
  journals,
  dataSource,
  selectedJournalId,
  onSelectJournal,
  onAskHerWrite,
  companionReveal,
}: HomePageProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [unlockEvents, setUnlockEvents] = useState<Array<{ id: string; eventSummary: string }>>([]);
  const [recalledMemory, setRecalledMemory] = useState<string>("");
  const isDev = import.meta.env.DEV;
  const selectedJournal = journals.find((journal) => journal.id === selectedJournalId) ?? journals[0];
  const anchorDate = selectedJournal?.date ?? journals[0]?.date ?? new Date().toISOString();
  const monthTitle = useMemo(() => formatDate(anchorDate).month, [anchorDate]);

  const userId = getCurrentUserId();
  useEffect(() => {
    fetchCompanionUnlocks(userId).then((result) => {
      setUnlockEvents(result.unlocks);
    }).catch(() => {
      // silently ignore unlock fetch errors
    });
    fetchCompanionContext(userId).then((result) => {
      if (result.recalledMemory) {
        setRecalledMemory(result.recalledMemory);
      }
    }).catch(() => {
      // silently ignore context fetch errors
    });
  }, [journals.length, selectedJournalId]);

  return (
    <section className="page-stack">
      {companionReveal ? (
        <div className="companion-home-hero card">
          <div>
            <p className="section-label">她已经在这里了</p>
            <h2>{companionReveal?.customName || companionReveal?.systemDisplayName || ""}</h2>
            <p className="hero-copy">{companionReveal.tagline}</p>
            <p className="companion-home-hero__note">
              她会先读你今天留下来的东西，再慢慢学会怎么陪你。
            </p>
          </div>
        </div>
      ) : null}

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
        <>
          <div className="detail-card card">
            <div className="detail-card__top">
              <div>
                <p className="section-label">{formatDate(selectedJournal.date).display}</p>
                <h3>当前选中的日记</h3>
              </div>
            </div>
            <p>{selectedJournal.content}</p>
          </div>
          <CompanionEchoCard text={recalledMemory || "她还记得你说过，下雨天总会让你想躲起来。"} />
          {unlockEvents.length > 0 && (
            <div style={{ fontSize: "13px", color: "#757575", padding: "8px 12px", background: "#F8F9FA", borderRadius: "6px", marginTop: "8px" }}>
              解锁事件：{unlockEvents[0].eventSummary}
            </div>
          )}
        </>
      ) : (
        <EmptyState title="还没有日记" description="先写第一篇吧，首页会立刻有内容。" />
      )}

      <button type="button" className="floating-button" onClick={onAskHerWrite}>
        ＋
      </button>
    </section>
  );
}
