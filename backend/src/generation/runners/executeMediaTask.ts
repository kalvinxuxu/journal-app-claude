type Mood = "开心" | "想念" | "感动" | "平静" | "调皮";
type VoiceStyle = "soft" | "warm" | "playful";

function buildVoiceSetting(mood: Mood, voiceStyle?: VoiceStyle) {
  const emotionMap: Record<Mood, string> = {
    开心: "happy",
    想念: "sad",
    感动: "touching",
    平静: "calm",
    调皮: "playful",
  };

  const voiceStyleMap: Record<VoiceStyle, { voice_id: string; speed: number; pitch: number }> = {
    soft: {
      voice_id: "Chinese (Mandarin)_Gentle_Senior",
      speed: 0.96,
      pitch: -1,
    },
    warm: {
      voice_id: "Chinese (Mandarin)_Warm_Bestie",
      speed: 1,
      pitch: 0,
    },
    playful: {
      voice_id: "qiaopi_mengmei",
      speed: 1.04,
      pitch: 1,
    },
  };

  const selected = voiceStyle ? voiceStyleMap[voiceStyle] : voiceStyleMap.warm;

  return {
    voice_id: selected.voice_id,
    speed: selected.speed,
    vol: 1,
    pitch: selected.pitch,
    emotion: emotionMap[mood],
  };
}

function hexToAudioDataUrl(hex: string): string {
  const hexBytes = hex.match(/.{1,2}/g) ?? [];
  const byteArray = new Uint8Array(hexBytes.length);
  for (let i = 0; i < hexBytes.length; i++) {
    byteArray[i] = parseInt(hexBytes[i], 16);
  }
  const binaryString = Array.from(byteArray, (b) => String.fromCharCode(b)).join("");
  const base64 = Buffer.from(binaryString, "binary").toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

export async function executeMediaTask(
  port: number,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const images: string[] = [];
  const voiceMessages: Array<{ id: string; timing: string; transcript: string; duration: string; audioUrl: string }> = [];
  const errors: Record<string, unknown> = {};
  const mood = (input.mood as Mood | undefined) ?? "开心";
  const voiceStyle = input.voiceStyle as VoiceStyle | undefined;

  if (input.prompt) {
    try {
      const imgResponse = await fetch(`http://localhost:${port}/api/image-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input.prompt, aspect_ratio: input.aspectRatio, n: input.n || 1 }),
      });
      const imgData = await imgResponse.json() as { data?: { image_urls?: string[] }; error?: string };
      if (imgData.data?.image_urls) {
        images.push(...imgData.data.image_urls);
      }
      if (imgData.error) {
        errors.image = imgData.error;
      } else if (images.length === 0) {
        errors.image = "图片生成返回空结果";
      }
    } catch (e) {
      errors.image = e instanceof Error ? e.message : String(e);
    }
  }

  if (input.voiceScripts) {
    for (const script of input.voiceScripts as Array<{ timing: string; transcript: string }>) {
      try {
        const ttsResponse = await fetch(`http://localhost:${port}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "speech-2.8-hd",
            text: script.transcript,
            stream: false,
            language_boost: "auto",
            output_format: "hex",
            voice_setting: buildVoiceSetting(mood, voiceStyle),
            audio_setting: {
              sample_rate: 32000,
              bitrate: 128000,
              format: "mp3",
              channel: 1,
            },
            pronunciation_dict: {},
            subtitle_enable: false,
          }),
        });
        const ttsData = await ttsResponse.json() as { data?: { audio?: string }; error?: string };
        if (ttsData.data?.audio) {
          voiceMessages.push({
            id: `voice-${script.timing}`,
            timing: script.timing,
            transcript: script.transcript,
            duration: "0:12",
            audioUrl: hexToAudioDataUrl(ttsData.data.audio),
          });
        }
        if (ttsData.error) {
          errors.tts = ttsData.error;
        }
      } catch (e) {
        errors.tts = e instanceof Error ? e.message : String(e);
      }
    }
  }

  return { images, voiceMessages, errors: Object.keys(errors).length > 0 ? errors : undefined };
}
