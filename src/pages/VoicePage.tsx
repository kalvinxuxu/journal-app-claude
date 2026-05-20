import { useEffect, useState } from "react";
import type { Journal } from "../types/journal";
import { EmptyState } from "../components/EmptyState";
import { VoicePlayer } from "../components/VoicePlayer";

type VoicePageProps = {
  journals: Journal[];
  selectedJournalId: string;
};

export function VoicePage({ journals, selectedJournalId }: VoicePageProps) {
  const journalsWithVoice = journals.filter((j) => j.voiceMessages.length > 0);
  const initialIndex = journalsWithVoice.findIndex((j) => j.id === selectedJournalId);
  const [currentJournalIndex, setCurrentJournalIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  );
  const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
  const [playerKey, setPlayerKey] = useState(0);

  useEffect(() => {
    const nextIndex = journalsWithVoice.findIndex((j) => j.id === selectedJournalId);
    if (nextIndex < 0) return;
    setCurrentJournalIndex(nextIndex);
    setCurrentVoiceIndex(0);
    setPlayerKey((k) => k + 1);
  }, [journals, selectedJournalId]);

  if (journalsWithVoice.length === 0) {
    return (
      <EmptyState
        title="语音已经回到日记里"
        description="现在每篇日记下方都可以直接切换和播放语音留言。这里后续可作为语音归档页。"
      />
    );
  }

  const safeJournalIndex = Math.min(currentJournalIndex, journalsWithVoice.length - 1);
  const journal = journalsWithVoice[safeJournalIndex];
  const activeVoiceIndex = Math.min(currentVoiceIndex, journal.voiceMessages.length - 1);
  const voice = journal.voiceMessages[activeVoiceIndex];
  const total = journal.voiceMessages.length;

  function handlePrevJournal() {
    if (currentJournalIndex <= 0) return;
    setCurrentJournalIndex((i) => i - 1);
    setCurrentVoiceIndex(0);
    setPlayerKey((k) => k + 1);
  }

  function handleNextJournal() {
    if (currentJournalIndex >= journalsWithVoice.length - 1) return;
    setCurrentJournalIndex((i) => i + 1);
    setCurrentVoiceIndex(0);
    setPlayerKey((k) => k + 1);
  }

  function handlePrev() {
    if (currentVoiceIndex <= 0) return;
    setCurrentVoiceIndex((i) => i - 1);
    setPlayerKey((k) => k + 1);
  }

  function handleNext() {
    if (currentVoiceIndex >= total - 1) return;
    setCurrentVoiceIndex((i) => i + 1);
    setPlayerKey((k) => k + 1);
  }

  function getTimingLabel(timing: string) {
    if (timing === "morning") return "早安";
    if (timing === "afternoon") return "午后";
    return "晚安";
  }

  const isFirstJournal = safeJournalIndex === 0;
  const isLastJournal = safeJournalIndex === journalsWithVoice.length - 1;

  return (
    <section className="page-stack">
      <div className="page-hero card voice-hero">
        <div>
          <p className="section-label">语音页</p>
          <h2>{journal.mood} 的声音</h2>
          <p className="hero-copy">这里先展示语音播放器和文字稿，后续可以接真实音频。</p>
        </div>

        <div className="voice-hero__meta" aria-label="语音概览">
          <span>自动生成</span>
          <span>{total} 条留言</span>
          <span>可展开文字稿</span>
        </div>
      </div>

      <div className="voice-nav card" aria-label="日记切换">
        <button
          type="button"
          className="ghost-button"
          onClick={handlePrevJournal}
          disabled={isFirstJournal}
          aria-label="上一篇日记"
        >
          ‹ {isFirstJournal ? "" : journalsWithVoice[safeJournalIndex - 1].mood}
        </button>

        <span className="voice-nav__indicator" aria-live="polite">
          {safeJournalIndex + 1} / {journalsWithVoice.length} 篇
        </span>

        <button
          type="button"
          className="ghost-button"
          onClick={handleNextJournal}
          disabled={isLastJournal}
          aria-label="下一篇日记"
        >
          {isLastJournal ? "" : journalsWithVoice[safeJournalIndex + 1].mood}
          ›
        </button>
      </div>

      <div className="voice-nav card" aria-label="语音时段切换">
        <button
          type="button"
          className="ghost-button"
          onClick={handlePrev}
          disabled={activeVoiceIndex <= 0}
          aria-label="上一条"
        >
          ‹ {activeVoiceIndex > 0 ? getTimingLabel(journal.voiceMessages[activeVoiceIndex - 1].timing) : "无"}
        </button>

        <span className="voice-nav__indicator" aria-live="polite">
          {activeVoiceIndex + 1} / {total}
        </span>

        <button
          type="button"
          className="ghost-button"
          onClick={handleNext}
          disabled={activeVoiceIndex >= total - 1}
          aria-label="下一条"
        >
          {activeVoiceIndex < total - 1 ? getTimingLabel(journal.voiceMessages[activeVoiceIndex + 1].timing) : "无"}
          ›
        </button>
      </div>

      <VoicePlayer key={playerKey} voiceMessage={voice} />

      <div className="detail-card card voice-scripts">
        <div className="detail-card__top">
          <div>
            <p className="section-label">完整语音稿</p>
            <h3>今天这一组留言</h3>
          </div>
          <span className="voice-scripts__count">{total} 条</span>
        </div>
        {journal.voiceMessages.map((message, idx) => (
          <article
            key={message.id}
            className={`voice-script${idx === activeVoiceIndex ? " is-active" : ""}`}
          >
            <strong>
              {message.timing === "morning"
                ? "早安"
                : message.timing === "afternoon"
                  ? "午后"
                  : "晚安"}
            </strong>
            <p>{message.transcript}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
