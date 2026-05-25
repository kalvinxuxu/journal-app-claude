import type { OotdCard } from "../../types/diaryWall";
import type { OotdItem } from "../../services/api/companionClient";

export type OotdCardWallItemProps = {
  ootd: OotdItem;
  ootdCard: OotdCard;
  onRefresh: () => void;
  userId: string;
  submitCompanionFeedback: (payload: {
    userId: string;
    journalId?: string;
    feedbackKind: string;
    feedbackValue: string;
  }) => void;
};

export function OotdCardWallItem({ ootd, ootdCard, onRefresh, userId, submitCompanionFeedback }: OotdCardWallItemProps) {
  const isFullbody = ootdCard.kind === "fullbody";
  const sectionLabel = isFullbody ? "今日OOTD" : "妆容特写";
  const heading = isFullbody ? "她今天想穿这套" : "近距离看看今天的妆";
  const likeLabel = isFullbody ? "喜欢这套" : "喜欢这个妆";
  const feedbackValue = isFullbody ? "like_fullbody" : "like_makeup";

  return (
    <div className="detail-card card ootd-card">
      <div className="detail-card__top">
        <div>
          <p className="section-label">{sectionLabel}</p>
          <h3>{heading}</h3>
        </div>
        {isFullbody && (
          <button type="button" className="toggle-button" onClick={onRefresh}>换一套</button>
        )}
      </div>
      {ootdCard.imageUrl ? (
        <div className="ootd-image-wrapper">
          <img src={ootdCard.imageUrl} alt={sectionLabel} className="ootd-image" />
        </div>
      ) : (
        <div style={{ width: "100%", height: "160px", background: "#F3E5F5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "12px" }}>
          <span style={{ color: "#6A1B9A", fontSize: "13px" }}>这是她今天想穿的</span>
        </div>
      )}
      {ootdCard.caption && (
        <p style={{ fontSize: "12px", color: "#757575", marginTop: "8px" }}>{ootdCard.caption}</p>
      )}
      <button
        type="button"
        className="toggle-button"
        style={{ marginTop: "10px" }}
        onClick={() => submitCompanionFeedback({ userId, journalId: ootd.id, feedbackKind: "ootd_reaction", feedbackValue })}
      >
        {likeLabel}
      </button>
    </div>
  );
}