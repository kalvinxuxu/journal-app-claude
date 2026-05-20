/**
 * Reminder scheduling abstraction for web prototype.
 * Uses Notification API where available, falls back to explicit unsupported state.
 */

export type ReminderResult = {
  success: boolean;
  error?: string;
};

export function isReminderSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isReminderSupported()) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function scheduleReminder(time: string): Promise<ReminderResult> {
  if (!isReminderSupported()) {
    return { success: false, error: "当前浏览器不支持通知功能" };
  }

  const permission = Notification.permission;
  if (permission !== "granted") {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return { success: false, error: "未获得通知权限，请在浏览器设置中开启" };
    }
  }

  // Parse time string "HH:MM"
  const [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return { success: false, error: `无效的时间格式：${time}` };
  }

  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);

  // If time has already passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  const delay = scheduled.getTime() - now.getTime();

  // For web prototype, we just log the scheduled time
  // A full implementation would use setTimeout with a unique ID tracking mechanism
  console.log(`[Reminder] Scheduled for ${scheduled.toLocaleString("zh-CN")} (delay: ${Math.round(delay / 1000)}s)`);

  return { success: true };
}

export function cancelReminder(_id: string): void {
  // In a full implementation, this would clear the specific setTimeout by ID
  console.log("[Reminder] cancelled");
}