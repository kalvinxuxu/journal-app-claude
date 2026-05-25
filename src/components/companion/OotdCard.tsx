import { useState } from "react";
import { fetchOotdByDate, regenerateOotd, type OotdItem } from "../../services/api/companionClient";
import { getCurrentUserId } from "../../services/memory";

type Props = {
  date: string;
  /** Called when a new OOTD has been generated */
  onRefresh?: (ootd: OotdItem) => void;
};

export function OotdCard({ date, onRefresh }: Props) {
  const [ootd, setOotd] = useState<OotdItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = getCurrentUserId();

  async function loadOotd() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOotdByDate(userId, date);
      setOotd(result);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await regenerateOotd(userId, date);
      setOotd(result);
      onRefresh?.(result);
    } catch {
      setError("刷新失败");
    } finally {
      setLoading(false);
    }
  }

  if (!ootd && !loading) {
    return (
      <div className="ootd-card card" style={{ textAlign: "center", padding: "24px" }}>
        <p className="section-label">今日OOTD</p>
        <p style={{ color: "#757575", fontSize: "13px", marginBottom: "12px" }}>
          今天她有想推荐的衣服吗？
        </p>
        <button
          type="button"
          className="toggle-button"
          onClick={loadOotd}
        >
          看看今天的穿搭
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ootd-card card" style={{ textAlign: "center", padding: "24px" }}>
        <p className="section-label">今日OOTD</p>
        <p style={{ color: "#757575", fontSize: "13px" }}>loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ootd-card card" style={{ textAlign: "center", padding: "24px" }}>
        <p className="section-label">今日OOTD</p>
        <p style={{ color: "#C62828", fontSize: "13px" }}>{error}</p>
        <button type="button" className="toggle-button" onClick={loadOotd}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="ootd-card card">
      <p className="section-label">今日OOTD</p>
      <p className="ootd-title" style={{ fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
        {ootd?.title ?? "今日OOTD"}
      </p>

      {ootd?.imageUrl ? (
        <div className="ootd-image-wrapper">
          <img src={ootd.imageUrl} alt="今日OOTD" className="ootd-image" />
        </div>
      ) : (
        <div className="ootd-image-placeholder" style={{ width: "100%", height: "160px", background: "#F3E5F5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#6A1B9A", fontSize: "13px" }}>这是她今天想穿的</span>
        </div>
      )}

      {ootd?.caption && (
        <p className="ootd-caption" style={{ fontSize: "12px", color: "#757575", marginTop: "8px" }}>
          {ootd.caption}
        </p>
      )}

      <button
        type="button"
        className="toggle-button"
        onClick={handleRegenerate}
        style={{ marginTop: "12px" }}
      >
        换一套
      </button>
    </div>
  );
}