import { useEffect, useRef, useState } from "react";
import type { VoiceMessage } from "../types/journal";

type VoicePlayerProps = {
  voiceMessage: VoiceMessage;
};

export function VoicePlayer({ voiceMessage }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("--:--");
  const [expanded, setExpanded] = useState(false);

  const hasAudio = Boolean(voiceMessage.audioUrl);

  // Sync progress bar with real audio timeupdate
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !hasAudio) return;

    function handleTimeUpdate() {
      if (!audioEl.duration || !isFinite(audioEl.duration)) return;
      const pct = (audioEl.currentTime / audioEl.duration) * 100;
      setProgress(pct);
      setCurrentTime(formatTime(audioEl.currentTime));
    }

    function handleLoadedMetadata() {
      setDuration(formatTime(audioEl.duration));
    }

    function handleEnded() {
      setPlaying(false);
      setProgress(100);
    }

    audioEl.addEventListener("timeupdate", handleTimeUpdate);
    audioEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioEl.addEventListener("ended", handleEnded);

    return () => {
      audioEl.removeEventListener("timeupdate", handleTimeUpdate);
      audioEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioEl.removeEventListener("ended", handleEnded);
    };
  }, [hasAudio, voiceMessage.audioUrl]);

  // Reset progress when voiceMessage changes (new message loaded)
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime("0:00");
    setDuration("--:--");
  }, [voiceMessage.id]);

  async function togglePlayback() {
    const audio = audioRef.current;

    if (hasAudio && audio) {
      if (playing) {
        audio.pause();
        setPlaying(false);
        return;
      }
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
      return;
    }

    // No audioUrl: simulate playback state for UI feedback
    setPlaying((v) => !v);
  }

  return (
    <section className="voice-player card">
      <div className="voice-player__top">
        <div>
          <p className="section-label">语音留言</p>
          <strong>
            {voiceMessage.timing === "morning"
              ? "早安留言"
              : voiceMessage.timing === "afternoon"
                ? "午后留言"
                : "晚安留言"}
          </strong>
        </div>

        <button type="button" className="ghost-button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "收起" : "展开"}
        </button>
      </div>

      <button type="button" className="voice-control" onClick={togglePlayback}>
        <span className={playing ? "voice-dot is-playing" : "voice-dot"} />
        <span>{playing ? "暂停" : "播放"}</span>
        <span className="voice-duration">
          {hasAudio ? `${currentTime} / ${duration}` : voiceMessage.duration}
        </span>
      </button>
      {!hasAudio && (
        <p className="voice-hint">⚠️ 语音未生成（请在设置页配置 MiniMax API）</p>
      )}

      {hasAudio ? <audio ref={audioRef} src={voiceMessage.audioUrl} preload="metadata" /> : null}

      <div className="voice-wave" aria-hidden="true">
        <span style={{ height: "28%" }} />
        <span style={{ height: "42%" }} />
        <span style={{ height: "18%" }} />
        <span style={{ height: "56%" }} />
        <span style={{ height: "30%" }} />
        <span style={{ height: "60%" }} />
        <span style={{ height: "24%" }} />
        <span style={{ height: "48%" }} />
      </div>

      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      {expanded ? <p className="voice-transcript">{voiceMessage.transcript}</p> : null}
    </section>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
