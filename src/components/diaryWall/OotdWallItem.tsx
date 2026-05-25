import type { OotdItem } from "../../services/api/companionClient";

export type OotdWallItemProps = {
  ootd: OotdItem | null;
  loading?: boolean;
  error?: string;
  onRefresh: () => void;
};

export function OotdWallItem({ ootd, loading, error, onRefresh }: OotdWallItemProps) {
  if (loading) {
    return (
      <div className="detail-card card">
        <p className="section-label">今日OOTD</p>
        <p style={{ color: "#757575", fontSize: "13px" }}>loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-card card">
        <p className="section-label">今日OOTD</p>
        <p style={{ color: "#C62828", fontSize: "13px" }}>{error}</p>
        <button type="button" className="toggle-button" onClick={onRefresh}>重试</button>
      </div>
    );
  }

  if (!ootd) return null;

  return (
    <div className="detail-card card ootd-card">
      <div className="detail-card__top">
        <div>
          <p className="section-label">今日OOTD</p>
          <h3>她今天想穿这套</h3>
        </div>
        <button type="button" className="toggle-button" onClick={onRefresh}>换一套</button>
      </div>
      {ootd.imageUrl ? (
        <div className="ootd-image-wrapper">
          <img src={ootd.imageUrl} alt="今日OOTD" className="ootd-image" />
        </div>
      ) : (
        <div style={{ width: "100%", height: "160px", background: "#F3E5F5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "12px" }}>
          <span style={{ color: "#6A1B9A", fontSize: "13px" }}>这是她今天想穿的</span>
        </div>
      )}
      {ootd.caption && (
        <p style={{ fontSize: "12px", color: "#757575", marginTop: "8px" }}>{ootd.caption}</p>
      )}
    </div>
  );
}
