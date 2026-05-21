// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Header", () => {
  it("renders photo wall entry and hides the old voice page entry", () => {
    render(<Header activePage="home" onNavigate={() => {}} />);

    expect(screen.getByRole("button", { name: "照片墙" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "语音页" })).toBeNull();
  });
});
