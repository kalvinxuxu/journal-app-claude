import type { OotdItem } from "../../services/api/companionClient";

export type OotdWallItemProps = {
  ootd: OotdItem | null;
  loading?: boolean;
  error?: string;
  onRefresh: () => void;
  userId: string;
  submitCompanionFeedback: (payload: {
    userId: string;
    journalId?: string;
    feedbackKind: string;
    feedbackValue: string;
  }) => void;
};

export function OotdWallItem({ ootd, loading, error, onRefresh, userId, submitCompanionFeedback }: OotdWallItemProps) {
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

  const cards = ootd.cards;
  const showDualCards = cards && cards.length >= 2;

  return (
    <>
      {/* Outfit card — always rendered */}
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
        <button
          type="button"
          className="toggle-button"
          style={{ marginTop: "10px" }}
          onClick={() => submitCompanionFeedback({ userId, journalId: ootd.id, feedbackKind: "ootd_reaction", feedbackValue: "like_fullbody" })}
        >
          喜欢这套
        </button>
      </div>

      {/* Second card — makeup closeup (rendered only when dual cards are available) */}
      {showDualCards && cards[1].imageUrl && (
        <div className="detail-card card ootd-card" style={{ marginTop: "16px" }}>
          <div className="detail-card__top">
            <div>
              <p className="section-label">妆容特写</p>
              <h3>近距离看看今天的妆</h3>
            </div>
          </div>
          <div className="ootd-image-wrapper">
            <img src={cards[1].imageUrl} alt="妆容特写" className="ootd-image" />
          </div>
          {cards[1].caption && (
            <p style={{ fontSize: "12px", color: "#757575", marginTop: "8px" }}>{cards[1].caption}</p>
          )}
          <button
            type="button"
            className="toggle-button"
            style={{ marginTop: "10px" }}
            onClick={() => submitCompanionFeedback({ userId, journalId: ootd.id, feedbackKind: "ootd_reaction", feedbackValue: "like_makeup" })}
          >
            喜欢这个妆
          </button>
        </div>
      )}
    </>
  );
}
