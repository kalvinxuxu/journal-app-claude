import { useState } from "react";
import type { VoiceMessage } from "../types/journal";
import { VoicePlayer } from "./VoicePlayer";

export type InlineVoiceBarProps = {
  voiceMessages: VoiceMessage[];
  keyPrefix?: string;
};

function getTimingLabel(timing: string) {
  if (timing === "morning") return "早安";
  if (timing === "afternoon") return "午后";
  return "晚安";
}

export function InlineVoiceBar({ voiceMessages, keyPrefix }: InlineVoiceBarProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = voiceMessages[activeIndex];

  if (!voiceMessages.length) return null;

  return (
    <section className="inline-voice-bar" aria-label="日记语音栏">
      <div className="inline-voice-tabs">
        {voiceMessages.map((msg, i) => (
          <button
            key={`${keyPrefix ?? "voice"}-${msg.id}-${msg.timing}`}
            type="button"
            className={i === activeIndex ? "inline-voice-tab is-active" : "inline-voice-tab"}
            onClick={() => setActiveIndex(i)}
          >
            {getTimingLabel(msg.timing)}
          </button>
        ))}
      </div>
      {active ? <VoicePlayer key={active.id} voiceMessage={active} /> : null}
    </section>
  );
}