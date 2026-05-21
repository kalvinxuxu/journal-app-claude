import type { TaskRunner } from "../types.js";
import { generateGreetingContent } from "../../providers/greetingContentProvider.js";
import type { GreetingTiming } from "../../storage/greetingSettings.js";

export function createGreetingRunner(deps: {
  port: number;
}): TaskRunner["run"] {
  return async function runGreetingTask(task: { id: string; inputJson: string }) {
    const input = JSON.parse(task.inputJson) as {
      timing: GreetingTiming;
      date: string;
      mood?: string;
      voiceStyle?: "soft" | "warm" | "playful";
    };

    const mood = input.mood ?? "开心";

    // Generate greeting content
    const greetingResult = await generateGreetingContent(
      input.timing,
      mood,
      input.voiceStyle
    );

    // Synthesize TTS via local MiniMax proxy
    let audioUrl = "";
    try {
      const ttsResult = await fetch(`http://localhost:${deps.port}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "speech-01-tba",
          text: greetingResult.voiceScript.transcript,
          stream: false,
          output_format: "hex",
          voice_setting: {
            voice_id: input.voiceStyle === "soft" ? "female-tianmei" : input.voiceStyle === "playful" ? "female-yu社" : "female-qinghua",
          },
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
        }),
      });

      if (ttsResult.ok) {
        const result = await ttsResult.json() as { data?: { audio?: string } };
        const hexAudio = result.data?.audio;
        if (hexAudio) {
          // hex string from MiniMax TTS → convert to base64 for storage
          const audioBuffer = Buffer.from(hexAudio, "hex");
          const audioBase64 = audioBuffer.toString("base64");
          const filename = `greeting-${input.timing}-${Date.now()}.mp3`;
          const saveResult = await fetch(`http://localhost:${deps.port}/api/media/audio`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioData: `data:audio/mpeg;base64,${audioBase64}` }),
          });
          if (saveResult.ok) {
            const saved = await saveResult.json() as { url?: string };
            audioUrl = saved.url ?? "";
          }
        }
      }
    } catch (err) {
      console.warn("[greetingRunner] TTS or save failed:", err);
    }

    return {
      output: {
        greetingContent: greetingResult.greetingContent,
        voiceScript: greetingResult.voiceScript,
        audioUrl,
      },
      resultSummary: { outcome: "full_success" },
    };
  };
}