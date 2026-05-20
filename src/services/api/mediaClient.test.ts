import { afterEach, describe, expect, it, vi } from "vitest";
import { synthesizeSpeech } from "./mediaClient";

describe("mediaClient voice style mapping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps soft/warm/playful to distinct MiniMax system voices", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: { audio: "00" } }),
    } as Response);

    await synthesizeSpeech({ text: "你好", mood: "平静", voiceStyle: "soft" });
    await synthesizeSpeech({ text: "你好", mood: "平静", voiceStyle: "warm" });
    await synthesizeSpeech({ text: "你好", mood: "平静", voiceStyle: "playful" });

    const softBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const warmBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    const playfulBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));

    expect(softBody.voice_setting.voice_id).toBe("Chinese (Mandarin)_Gentle_Senior");
    expect(warmBody.voice_setting.voice_id).toBe("Chinese (Mandarin)_Warm_Bestie");
    expect(playfulBody.voice_setting.voice_id).toBe("qiaopi_mengmei");
    expect(softBody.voice_setting.voice_id).not.toBe(warmBody.voice_setting.voice_id);
    expect(warmBody.voice_setting.voice_id).not.toBe(playfulBody.voice_setting.voice_id);
  });
});
