// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Header", () => {
  it("renders voice page entry in top-level navigation", () => {
    render(<Header activePage="home" onNavigate={() => {}} />);

    expect(screen.getByRole("button", { name: "语音页" })).toBeTruthy();
  });
});
