/**
 * Content generation provider interface.
 * Each provider implements the same contract for generating journal content.
 */

export type VoiceTiming = "morning" | "afternoon" | "night";

export type VoiceScript = {
  timing: VoiceTiming;
  transcript: string;
  duration: string;
};

export type ContentProviderOutput = {
  journalContent: string;
  voiceScripts: VoiceScript[];
  error?: string;
};

export type ContentProviderInput = {
  mood: string;
  date: string;
  recalledMemory?: string;
  voiceStyle?: "soft" | "warm" | "playful";
  sceneHint?: string;
};

export interface ContentProvider {
  generate(input: ContentProviderInput): Promise<ContentProviderOutput>;
  name(): string;
}