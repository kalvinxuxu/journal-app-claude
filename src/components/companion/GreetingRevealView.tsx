import { useState, useEffect, useCallback } from "react";
import type { GreetingCard } from "../../services/greetingStore";

const TIMING_LABELS: Record<string, string> = {
  morning: "早安",
  afternoon: "午安",
  night: "晚安",
};

type Props = {
  greeting: GreetingCard;
  onComplete?: () => void;
};

const TYPEWRITER_INTERVAL_MS = 40;

/**
 * GreetingRevealView shows a greeting with a typewriter reveal effect.
 * The user feels like she is typing to them in the moment.
 */
export function GreetingRevealView({ greeting, onComplete }: Props) {
  const [displayedText, setDisplayedText] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const completeReveal = useCallback(() => {
    setDisplayedText(greeting.content);
    setIsComplete(true);
    setIsRevealing(false);
    onComplete?.();
  }, [greeting.content, onComplete]);

  useEffect(() => {
    // Start typewriter effect on mount
    setDisplayedText("");
    setIsComplete(false);
    setIsRevealing(true);

    let charIndex = 0;
    const content = greeting.content;

    const intervalId = setInterval(() => {
      if (charIndex < content.length) {
        charIndex++;
        setDisplayedText(content.slice(0, charIndex));
      } else {
        clearInterval(intervalId);
        setIsRevealing(false);
        setIsComplete(true);
        onComplete?.();
      }
    }, TYPEWRITER_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [greeting.content, onComplete]);

  function handleSkip() {
    if (isRevealing) {
      completeReveal();
    }
  }

  return (
    <div className="detail-card card" style={{ cursor: isRevealing ? "pointer" : "default" }} onClick={handleSkip}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="section-label">
          {TIMING_LABELS[greeting.timing] ?? greeting.timing}
        </span>
        <span style={{ color: "#757575", fontSize: "12px" }}>
          {new Date(greeting.deliveredAt).toLocaleDateString()}
        </span>
      </div>
      <p style={{ marginTop: "12px", lineHeight: 1.8, fontSize: "15px", color: "#212121" }}>
        {displayedText}
        {isRevealing && <span className="typewriter-cursor">|</span>}
      </p>
      {isComplete && greeting.audioUrl && (
        <div style={{ marginTop: "16px" }}>
          <audio controls src={greeting.audioUrl} style={{ width: "100%" }} />
        </div>
      )}
      {isRevealing && (
        <p style={{ color: "#757575", fontSize: "11px", marginTop: "12px", textAlign: "right" }}>
          点击跳过
        </p>
      )}
    </div>
  );
}