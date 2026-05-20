// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { isReminderSupported, scheduleReminder, type ReminderResult } from "./reminders";

describe("reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isReminderSupported", () => {
    it("returns false when Notification API is not available", () => {
      const original = (window as any).Notification;
      delete (window as any).Notification;
      expect(isReminderSupported()).toBe(false);
      (window as any).Notification = original;
    });
  });

  describe("scheduleReminder", () => {
    it("returns error for unsupported browsers", async () => {
      const original = (window as any).Notification;
      delete (window as any).Notification;

      const result = await scheduleReminder("09:00");

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      (window as any).Notification = original;
    });

    it("returns error for invalid time format", async () => {
      (window as any).Notification = { permission: "granted" };
      const result = await scheduleReminder("invalid");
      expect(result.success).toBe(false);
      expect(result.error).toContain("无效的时间格式");
    });

    it("returns error when permission not granted", async () => {
      (window as any).Notification = {
        permission: "denied",
        requestPermission: async () => "denied",
      };

      const result = await scheduleReminder("09:00");

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns success when permission already granted", async () => {
      (window as any).Notification = { permission: "granted" };

      const result = await scheduleReminder("23:59");

      expect(result.success).toBe(true);
    });
  });
});