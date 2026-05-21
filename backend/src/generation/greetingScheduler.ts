import type { GenerationTaskService } from "./types.js";
import type { GreetingSettings } from "../storage/greetingSettings.js";

const lastTriggerDate = new Map<string, string>();

export function createGreetingScheduler(deps: {
  settingsStore: { get(): GreetingSettings };
  taskService: GenerationTaskService;
  checkIntervalMs?: number;
}) {
  const checkIntervalMs = deps.checkIntervalMs ?? 30_000;

  function checkAndFire() {
    const settings = deps.settingsStore.get();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Current UTC time in minutes since midnight UTC
    const utcNowMinutes = Math.floor(now.getTime() / 60000);

    for (const timingSetting of settings.times) {
      if (!timingSetting.enabled) continue;

      const [hours, minutes] = timingSetting.time.split(":").map(Number);
      const targetLocalMinutes = hours * 60 + minutes;

      // User's timezone offset in minutes
      // For UTC+8 (China), getTimezoneOffset() = -480, so tzOffset = -(-480) = 480
      // tzOffset = how many minutes to ADD to user local time to get UTC
      // UTC = local - tzOffset → tzOffset = local - UTC
      // getTimezoneOffset() = local - UTC, so tzOffset = getTimezoneOffset()
      const tzOffset = timingSetting.timezone ?? now.getTimezoneOffset();

      // Target time in UTC minutes
      const targetUtcMinutes = targetLocalMinutes - tzOffset;

      // Within a 2-minute window after the target time in user's local time
      const userLocalNowMinutes = utcNowMinutes + tzOffset;
      if (userLocalNowMinutes < targetUtcMinutes || userLocalNowMinutes > targetUtcMinutes + 2) continue;

      const lastTrigger = lastTriggerDate.get(timingSetting.timing);
      if (lastTrigger === todayStr) continue; // already fired today

      // Fire!
      lastTriggerDate.set(timingSetting.timing, todayStr);
      void deps.taskService.createTask({
        type: "daily_greeting",
        input: {
          timing: timingSetting.timing,
          date: todayStr,
          mood: "开心",
          voiceStyle: timingSetting.voiceStyle,
        },
        priority: 8,
      }).catch(err => {
        console.error(`[greetingScheduler] Failed to create greeting task for ${timingSetting.timing}:`, err);
      });
    }
  }

  function start() {
    const id = setInterval(checkAndFire, checkIntervalMs);
    return () => clearInterval(id);
  }

  return { start, checkAndFire };
}