export type Mood = "开心" | "想念" | "感动" | "平静" | "调皮";

export type VoiceTiming = "morning" | "afternoon" | "night";

export type VoiceMessage = {
  id: string;
  timing: VoiceTiming;
  transcript: string;
  duration: string;
  audioUrl?: string;
};

export type JournalSource = "user" | "girlfriend";

export type JournalStatus = "idle" | "loading" | "ready" | "error";

export type Journal = {
  id: string;
  date: string;
  weekday: string;
  mood: Mood;
  source: JournalSource;
  content: string;
  isDailySummary?: boolean;
  aggregateJournalId?: string;
  entryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  images?: string[];
  selfies?: string[];
  nightBonusSelfie?: string;
  referenceImage?: string;  // 人物一致性参考图片URL
  voiceMessages: VoiceMessage[];
  voiceStyle?: "soft" | "warm" | "playful";
  ttsStatus?: JournalStatus;  // TTS 合成状态，防止并发
  selfieStatus?: JournalStatus;  // 自拍生成状态，防止并发
};

export type AppPage = "home" | "ask-her" | "photo-wall" | "settings" | "greetings";

export type Preferences = {
  reminderTime: string;
  voiceStyle: "soft" | "warm" | "playful";
  exportMode: "pdf" | "image" | "none";
};
