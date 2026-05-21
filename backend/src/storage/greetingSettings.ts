export type GreetingTiming = "morning" | "afternoon" | "night";

export interface GreetingTimeSetting {
  timing: GreetingTiming;
  enabled: boolean;
  time: string; // "HH:MM" in user's local time
  voiceStyle: "soft" | "warm" | "playful";
  timezone?: number; // User's timezone offset in minutes (e.g., -480 for UTC+8)
}

export interface GreetingSettings {
  times: GreetingTimeSetting[];
}

export const DEFAULT_GREETING_SETTINGS: GreetingSettings = {
  times: [
    { timing: "morning", enabled: true, time: "08:00", voiceStyle: "warm", timezone: new Date().getTimezoneOffset() },
    { timing: "afternoon", enabled: true, time: "12:30", voiceStyle: "warm", timezone: new Date().getTimezoneOffset() },
    { timing: "night", enabled: true, time: "21:00", voiceStyle: "warm", timezone: new Date().getTimezoneOffset() },
  ],
};