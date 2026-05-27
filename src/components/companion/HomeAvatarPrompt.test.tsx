import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeAvatarPrompt } from "./HomeAvatarPrompt";
import { fetchActiveAvatarPrompt, submitAvatarPromptChoice } from "../../services/api/companionClient";

vi.mock("../../services/api/companionClient");

describe("HomeAvatarPrompt", () => {
  it("loads an active prompt and submits a selected option", async () => {
    (fetchActiveAvatarPrompt as any).mockResolvedValue({
      prompt: {
        id: "avp_1",
        promptType: "outfit_choice",
        promptText: "今晚要见朋友，我穿哪件比较好呀？",
        options: [
          { id: "white_dress", label: "白裙子", consequenceTag: "soft_gentle" },
          { id: "black_knit", label: "黑色针织", consequenceTag: "calm_polished" },
          { id: "denim_jacket", label: "牛仔外套", consequenceTag: "casual_playful" },
        ],
        status: "active",
        selectedOptionId: null,
        acknowledgementText: null,
      },
    });
    (submitAvatarPromptChoice as any).mockResolvedValue({
      ok: true,
      acknowledgement: "好吧，那我听你的。",
    });

    const onResolved = vi.fn();
    render(<HomeAvatarPrompt userId="local-user" onResolved={onResolved} />);

    expect(await screen.findByText("今晚要见朋友，我穿哪件比较好呀？")).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "打开她的消息" }));
    await userEvent.click(screen.getByRole("button", { name: "白裙子" }));
    await userEvent.click(screen.getByRole("button", { name: "发送选择" }));

    await waitFor(() =>
      expect(onResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedOptionId: "white_dress",
          acknowledgement: expect.stringContaining("听你的"),
        }),
      ),
    );
  });

  it("shows a bubble state first, then opens the in-place chooser panel", async () => {
    (fetchActiveAvatarPrompt as any).mockResolvedValue({
      prompt: {
        id: "avp_1",
        promptType: "outfit_choice",
        promptText: "今晚要见朋友，我穿哪件比较好呀？",
        options: [
          { id: "white_dress", label: "白裙子", consequenceTag: "soft_gentle" },
          { id: "black_knit", label: "黑色针织", consequenceTag: "calm_polished" },
          { id: "denim_jacket", label: "牛仔外套", consequenceTag: "casual_playful" },
        ],
        status: "active",
        selectedOptionId: null,
        acknowledgementText: null,
      },
    });

    render(<HomeAvatarPrompt userId="local-user" onResolved={vi.fn()} />);

    expect(await screen.findByText("今晚要见朋友，我穿哪件比较好呀？")).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "打开她的消息" }));

    expect(screen.getByRole("button", { name: "白裙子" })).toBeDefined();
    expect(screen.getByRole("button", { name: "发送选择" })).toBeDefined();
  });
});