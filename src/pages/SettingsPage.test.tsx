// @vitest-environment jsdom

import { afterEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPage } from "./SettingsPage";
import type { Preferences } from "../types/journal";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SettingsPage", () => {
  const defaultPreferences: Preferences = {
    reminderTime: "09:00",
    voiceStyle: "soft",
    exportMode: "none",
  };

  it("renders settings form with all fields", () => {
    const mockOnChange = () => {};

    render(<SettingsPage preferences={defaultPreferences} onChange={mockOnChange} />);

    expect(screen.getByText("设置")).toBeTruthy();
    expect(screen.getByText("提醒时间")).toBeTruthy();
    expect(screen.getByText("语音风格")).toBeTruthy();
    expect(screen.getByText("导出方式")).toBeTruthy();
  });

  it("shows the current girlfriend persona summary", () => {
    const mockOnChange = () => {};

    render(<SettingsPage preferences={defaultPreferences} onChange={mockOnChange} />);

    expect(screen.getByText(/当前人设：小棠，轻熟陪伴型/)).toBeTruthy();
    expect(screen.getByText(/说话风格：`soft`/)).toBeTruthy();
  });

  it("renders time input with correct value", () => {
    const mockOnChange = () => {};

    render(<SettingsPage preferences={defaultPreferences} onChange={mockOnChange} />);

    const timeInput = screen.getByDisplayValue("09:00") as HTMLInputElement;
    expect(timeInput).toBeTruthy();
    expect(timeInput.type).toBe("time");
  });

  it("calls onChange when reminder time changes", () => {
    const captured: Preferences[] = [];
    const mockOnChange = (prefs: Preferences) => captured.push(prefs);

    render(<SettingsPage preferences={defaultPreferences} onChange={mockOnChange} />);

    const timeInput = screen.getByDisplayValue("09:00") as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "20:00" } });

    expect(captured).toHaveLength(1);
    expect(captured[0].reminderTime).toBe("20:00");
  });

  it("calls onChange when voice style changes", () => {
    const captured: Preferences[] = [];
    const mockOnChange = (prefs: Preferences) => captured.push(prefs);

    render(<SettingsPage preferences={defaultPreferences} onChange={mockOnChange} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "warm" } });

    expect(captured).toHaveLength(1);
    expect(captured[0].voiceStyle).toBe("warm");
  });

  it("calls onChange when export mode changes", () => {
    const captured: Preferences[] = [];
    const mockOnChange = (prefs: Preferences) => captured.push(prefs);

    render(<SettingsPage preferences={defaultPreferences} onChange={mockOnChange} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "pdf" } });

    expect(captured).toHaveLength(1);
    expect(captured[0].exportMode).toBe("pdf");
  });

  it("preserves other preferences when one changes", () => {
    const captured: Preferences[] = [];
    const mockOnChange = (prefs: Preferences) => captured.push(prefs);

    render(<SettingsPage preferences={defaultPreferences} onChange={mockOnChange} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "playful" } });

    expect(captured[0].reminderTime).toBe("09:00");
    expect(captured[0].exportMode).toBe("none");
  });
});
