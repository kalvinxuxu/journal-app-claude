import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeepSeekContentProvider } from "./deepseekContentProvider";

describe("DeepSeekContentProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes sceneHint in journal and voice generation prompts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "今天和你一起看电影，心里一直暖暖的。" } }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "早安|想起今晚一起看电影就开心\n午后|爆米花味道还像在身边\n晚安|下次还想和你一起看电影" } }],
        }),
      } as Response);

    const provider = createDeepSeekContentProvider();

    await provider.generate({
      mood: "开心",
      date: "2026-05-18",
      sceneHint: "今天一起看电影",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));

    expect(JSON.stringify(firstBody.messages)).toContain("今天一起看电影");
    expect(JSON.stringify(secondBody.messages)).toContain("今天一起看电影");
  });
});
