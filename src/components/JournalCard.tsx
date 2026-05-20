import { useState, useRef } from "react";
import type { Journal } from "../types/journal";
import { formatDate } from "../utils/formatDate";
import { MoodTag } from "./MoodTag";
import { InlineVoiceBar } from "./InlineVoiceBar";
import { synthesizeContentSpeech } from "../services/minimax";

type JournalCardProps = {
  journal: Journal;
  active: boolean;
  onSelect: (id: string) => void;
};

export function JournalCard({ journal, active, onSelect }: JournalCardProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [contentAudioState, setContentAudioState] = useState<"idle" | "loading" | "playing">("idle");
  const contentAudioRef = useRef<HTMLAudioElement | null>(null);
  const dateInfo = formatDate(journal.date);

  async function handlePlayContent() {
    if (contentAudioState === "playing") {
      contentAudioRef.current?.pause();
      setContentAudioState("idle");
      return;
    }
    if (contentAudioState === "loading") return;

    setContentAudioState("loading");
    try {
      const audioUrl = await synthesizeContentSpeech(journal.content, {
        mood: journal.mood,
        voiceStyle: journal.voiceStyle,
      });
      if (!audioUrl) throw new Error("No audio generated");

      const audio = contentAudioRef.current;
      if (!audio) throw new Error("Audio element missing");

      audio.onerror = (e) => {
        console.error("[Audio] Load failed:", e);
        setContentAudioState("idle");
      };
      audio.onended = () => {
        setContentAudioState("idle");
      };
      audio.src = audioUrl;
      audio.load();
      await audio.play();
      setContentAudioState("playing");
    } catch (err) {
      console.error("[Content TTS] Failed:", err);
      setContentAudioState("idle");
    }
  }

  return (
    <>
      <article className={active ? "journal-card card is-active" : "journal-card card"}>
        <div role="button" tabIndex={0} className="card-select" onClick={() => onSelect(journal.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(journal.id)}>
          <div className="journal-card__top">
            <div>
              <p className="section-label">{dateInfo.display}</p>
              <h3>{journal.mood} 手账</h3>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span className="journal-source-chip">
                {journal.isDailySummary ? "当天累计" : journal.source === "user" ? "我写的" : "她写的"}
              </span>
              <MoodTag mood={journal.mood} />
            </div>
          </div>

          <p className="journal-card__content">
            {journal.content}
          </p>
          <button
            type="button"
            className="content-play-btn"
            onClick={(e) => { e.stopPropagation(); handlePlayContent(); }}
            disabled={contentAudioState === "loading"}
            aria-label="播放日记内容"
          >
            {contentAudioState === "loading" ? "生成中..." : contentAudioState === "playing" ? "暂停" : "▶ 听日记"}
          </button>
          <audio ref={contentAudioRef} preload="metadata" />

          {journal.images && journal.images.length > 0 ? (
            <div className="image-strip" aria-label="配图预览">
              {journal.images.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="image-tile"
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex(index); }}
                >
                  <img src={src} alt={`配图 ${index + 1}`} />
                </div>
              ))}
            </div>
          ) : null}

          {journal.selfies && journal.selfies.length > 0 ? (
            <div className="selfie-strip" aria-label="女友自拍">
              <p className="selfie-label">女友自拍</p>
              <div className="selfie-images">
                {journal.selfies.map((src, index) => (
                  <div
                    key={`selfie-${src}-${index}`}
                    className="selfie-tile"
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex(index + (journal.images?.length ?? 0)); }}
                  >
                    <img src={src} alt={`女友自拍 ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {journal.nightBonusSelfie ? (
            <div className="night-bonus-strip" aria-label="夜间加餐">
              <p className="selfie-label">夜间加餐</p>
              <img src={journal.nightBonusSelfie} alt="夜间自拍" />
            </div>
          ) : null}

          {journal.voiceMessages.length > 0 ? (
            <InlineVoiceBar voiceMessages={journal.voiceMessages} />
          ) : null}
        </div>
      </article>

      {galleryIndex !== null && (
        <div
          className="image-gallery-overlay"
          onClick={() => setGalleryIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
        >
          <img
            src={galleryIndex < (journal.images?.length ?? 0) ? journal.images[galleryIndex] : journal.selfies[galleryIndex - (journal.images?.length ?? 0)]}
            alt="预览"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
