import { useState, useEffect } from "react";
import { greetingStore, type GreetingCard as GreetingCardType } from "../../services/greetingStore";
import { getCurrentUserId } from "../../services/memory";

const TIMING_LABELS: Record<string, string> = {
  morning: "早安",
  afternoon: "午安",
  night: "晚安",
};

type Props = {
  /** Called when user wants to open the greeting detail */
  onOpen?: () => void;
};

export function GreetingCard({ onOpen }: Props) {
  const [pendingGreeting, setPendingGreeting] = useState<GreetingCardType | null>(null);
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    // Load the latest greeting on mount
    const latest = greetingStore.getLatestGreeting();
    if (latest && !latest.isRead) {
      setPendingGreeting(latest);
      setIsRead(false);
    } else if (latest && latest.isRead) {
      setPendingGreeting(latest);
      setIsRead(true);
    }
  }, []);

  function handleOpen() {
    if (!pendingGreeting) return;
    greetingStore.markAsRead(pendingGreeting.id);
    setIsRead(true);
    onOpen?.();
  }

  if (!pendingGreeting) {
    return (
      <div className="greeting-card card" style={{ textAlign: "center", padding: "24px" }}>
        <p className="section-label">每日问候</p>
        <p style={{ color: "#757575", fontSize: "13px", marginBottom: "12px" }}>
          她会按时和你打招呼
        </p>
      </div>
    );
  }

  if (!isRead) {
    return (
      <button
        type="button"
        className="greeting-card card"
        onClick={handleOpen}
        style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "none", background: "#E8F5E9" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="section-label">{TIMING_LABELS[pendingGreeting.timing] ?? pendingGreeting.timing}</p>
          <span style={{
            background: "#2E7D32",
            color: "white",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "4px"
          }}>
            未读
          </span>
        </div>
        <p style={{
          color: "#424242",
          fontSize: "13px",
          marginTop: "8px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          {pendingGreeting.content.slice(0, 30)}...
        </p>
        <p style={{ color: "#757575", fontSize: "11px", marginTop: "8px" }}>
          点击查看
        </p>
      </button>
    );
  }

  return (
    <div className="greeting-card card" style={{ background: "#F8F9FA" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="section-label">{TIMING_LABELS[pendingGreeting.timing] ?? pendingGreeting.timing}</p>
        <span style={{
          background: "#BDBDBD",
          color: "white",
          fontSize: "10px",
          padding: "2px 6px",
          borderRadius: "4px"
        }}>
          已读
        </span>
      </div>
      <p style={{ color: "#424242", fontSize: "13px", marginTop: "8px" }}>
        {pendingGreeting.content.slice(0, 50)}...
      </p>
    </div>
  );
}