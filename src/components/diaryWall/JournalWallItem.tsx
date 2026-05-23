import type { Journal } from "../../types/journal";

export type JournalWallItemProps = {
  journal: Journal | null;
  onRefresh: () => void;
  isLoading: boolean;
};

export function JournalWallItem({ journal, onRefresh, isLoading }: JournalWallItemProps) {
  if (!journal) {
    return (
      <div className="detail-card card">
        <div className="detail-card__top">
          <div>
            <p className="section-label">今日日记</p>
            <h3>她还没有记录今天</h3>
          </div>
        </div>
        <p style={{ color: "#757575" }}>点击按钮，让她为你记录今天。</p>
        <button
          type="button"
          className="primary-button"
          onClick={onRefresh}
          disabled={isLoading}
          style={{ marginTop: "12px" }}
        >
          {isLoading ? "记录中..." : "让她记录今天"}
        </button>
      </div>
    );
  }

  return (
    <div className="detail-card card">
      <div className="detail-card__top">
        <div>
          <p className="section-label">今日日记</p>
          <h3>她记录了这一天</h3>
        </div>
        <button
          type="button"
          className="toggle-button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? "记录中..." : "重新记录今天"}
        </button>
      </div>

      <p>{journal.content}</p>

      {journal.images && journal.images.length > 0 && (
        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {journal.images.map((img, i) => (
            <img key={i} src={img} alt={`Generated ${i + 1}`} style={{ width: "100%", borderRadius: "8px" }} />
          ))}
        </div>
      )}
    </div>
  );
}