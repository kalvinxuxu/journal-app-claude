import { useState, useEffect, useCallback } from "react";
import { greetingStore, type GreetingCard as GreetingCardType } from "../services/greetingStore";
import { GreetingRevealView } from "../components/companion/GreetingRevealView";
import { getCurrentUserId } from "../services/memory";

const TIMING_LABELS: Record<string, string> = {
  morning: "早安",
  afternoon: "午安",
  night: "晚安",
};

type GreetingPageProps = {
  onBack: () => void;
};

export function GreetingPage({ onBack }: GreetingPageProps) {
  const [greetings, setGreetings] = useState<GreetingCardType[]>([]);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setGreetings(greetingStore.getGreetings());
  }, []);

  useEffect(() => {
    refresh();
    // Poll for new greetings every 5 seconds while page is visible
    const interval = setInterval(refresh, 5_000);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleRevealComplete(greetingId: string) {
    greetingStore.markAsRead(greetingId);
    setRevealedId(greetingId);
    refresh();
  }

  return (
    <section className="page-stack">
      <div className="page-hero card">
        <div>
          <p className="section-label">每日问候</p>
          <h2>她的早安、午安、晚安</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>返回</button>
      </div>

      <div className="form-grid">
        {greetings.length === 0 ? (
          <div className="detail-card card">
            <p style={{ color: "#757575", textAlign: "center" }}>暂无问候记录</p>
          </div>
        ) : (
          greetings.map((greeting) => {
            // Show typewriter reveal for unread greetings that haven't been revealed yet
            if (!greeting.isRead && !revealedId) {
              return (
                <GreetingRevealView
                  key={greeting.id}
                  greeting={greeting}
                  onComplete={() => handleRevealComplete(greeting.id)}
                />
              );
            }
            return (
              <div key={greeting.id} className="detail-card card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="section-label">
                    {TIMING_LABELS[greeting.timing] ?? greeting.timing}
                  </span>
                  <span style={{ color: "#757575", fontSize: "12px" }}>
                    {new Date(greeting.deliveredAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ marginTop: "8px", lineHeight: 1.6 }}>{greeting.content}</p>
                {greeting.audioUrl && (
                  <div style={{ marginTop: "12px" }}>
                    <audio controls src={greeting.audioUrl} style={{ width: "100%" }} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="action-row">
        <button type="button" className="ghost-button" onClick={onBack}>返回</button>
        <button type="button" className="ghost-button" onClick={refresh}>刷新</button>
      </div>
    </section>
  );
}