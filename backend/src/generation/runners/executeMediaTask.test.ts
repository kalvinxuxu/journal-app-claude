import { describe, expect, it, vi, afterEach } from "vitest";
import { executeMediaTask } from "./executeMediaTask";

describe("executeMediaTask", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses full TTS payload and converts returned hex audio to data URL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        json: async () => ({ data: { image_urls: ["http://img.local/a.jpg"] } }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ data: { audio: "6869" } }),
      } as Response);

    const result = await executeMediaTask(3001, {
      prompt: "movie scene",
      aspectRatio: "1:1",
      n: 1,
      mood: "开心",
      voiceStyle: "warm",
      voiceScripts: [{ timing: "morning", transcript: "早安" }],
    });

    const ttsBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(ttsBody.output_format).toBe("hex");
    expect(ttsBody.voice_setting.voice_id).toBe("Chinese (Mandarin)_Warm_Bestie");
    const voiceMessages = result.voiceMessages as Array<{ audioUrl: string }>;
    expect(result.images).toEqual(["http://img.local/a.jpg"]);
    expect(voiceMessages[0].audioUrl).toBe("data:audio/mpeg;base64,aGk=");
  });
});
