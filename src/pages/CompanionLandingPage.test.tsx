import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompanionLandingPage } from "./CompanionLandingPage";

describe("CompanionLandingPage", () => {
  it("binds three curated local images to the landing page sections", () => {
    render(<CompanionLandingPage onContinue={vi.fn()} />);

    const images = screen.getAllByRole("img");

    expect(images).toHaveLength(3);
    expect((images[0] as HTMLImageElement).alt).toBe("深夜等你出现的她");
    expect((images[1] as HTMLImageElement).alt).toBe("她在深夜里轻声和你说话");
    expect((images[2] as HTMLImageElement).alt).toBe("她刚刚想到你");
  });

  it("renders hero, chat, and voice scenes in a single-page progression", () => {
    render(<CompanionLandingPage onContinue={vi.fn()} />);

    expect(screen.getByText("你终于来了。")).toBeDefined();
    expect(screen.getByText("今天是不是又很累？")).toBeDefined();
    expect(screen.getByText("我猜你应该还没睡。")).toBeDefined();
    expect(screen.getByText("刚刚突然想到你了。")).toBeDefined();
    expect(screen.getByText("其实我刚刚有点想你。")).toBeDefined();
    expect(screen.getAllByRole("button", { name: "回复她" }).length).toBeGreaterThan(0);
  });

  it("uses dedicated scene and overlay classes for the visual landing flow", () => {
    const { container } = render(<CompanionLandingPage onContinue={vi.fn()} />);

    expect(container.querySelector(".companion-landing__scene--hero")).toBeTruthy();
    expect(container.querySelector(".companion-landing__scene--chat")).toBeTruthy();
    expect(container.querySelector(".companion-landing__scene--voice")).toBeTruthy();
    expect(container.querySelector(".companion-landing__overlay--chat")).toBeTruthy();
    expect(container.querySelector(".companion-landing__overlay--voice")).toBeTruthy();
  });

  it("calls onContinue when the primary CTA is clicked", async () => {
    const onContinue = vi.fn();
    render(<CompanionLandingPage onContinue={onContinue} />);

    const buttons = screen.getAllByRole("button", { name: "回复她" });
    buttons[0].click();

    expect(onContinue).toHaveBeenCalled();
  });
});