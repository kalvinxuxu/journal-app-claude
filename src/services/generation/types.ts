// Task types
export type TaskType = "media" | "content" | "selfie";

// Task status
export type TaskStatus = "pending" | "running" | "success" | "failed";

// Task error interface
export interface TaskError {
  code: string;
  message: string;
  retryable: boolean;
}

// Voice timing - consistency with JournalTypes
export type GenerationVoiceTiming = "morning" | "afternoon" | "night";

// Voice message for generation tasks
export interface GenerationVoiceMessage {
  id: string;
  timing: GenerationVoiceTiming;
  transcript: string;
  duration: string;
  audioUrl?: string;
}

// Journal input for media tasks - aligns with Journal type from journal.ts
export interface MediaTaskInput {
  journal: {
    id: string;
    date: string;
    weekday: string;
    mood: string;
    content: string;
    voiceMessages: GenerationVoiceMessage[];
  };
  referenceImage?: string;
  generateSelfies?: boolean;
  voiceStyle?: "soft" | "warm" | "playful";
}

export interface ContentTaskInput {
  mood: string;
  date: string;
  recalledMemory?: string;
  voiceStyle?: "soft" | "warm" | "playful";
  sceneHint?: string;
}

export interface SelfieTaskInput {
  mood: string;
  referenceImage?: string;
  content?: string;
  date?: string;
}

export type TaskInput = MediaTaskInput | ContentTaskInput | SelfieTaskInput;

// Task output - varies by type
export interface MediaTaskOutput {
  images?: string[];
  voiceMessages?: GenerationVoiceMessage[];
  selfies?: {
    morningSelfie?: string;
    eveningSelfie?: string;
  };
}

export interface ContentTaskOutput {
  journalContent: string;
  voiceScripts: Array<{
    timing: string;
    transcript: string;
    duration: string;
  }>;
}

export interface SelfieTaskOutput {
  selfie?: string;
}

export type TaskOutput = MediaTaskOutput | ContentTaskOutput | SelfieTaskOutput;

// Main GenerationTask interface
export interface GenerationTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  input: TaskInput;
  output?: TaskOutput;
  error?: TaskError;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

// Type guards for narrowing
export function isMediaTask(task: GenerationTask): task is GenerationTask & { input: MediaTaskInput } {
  return task.type === "media";
}

export function isContentTask(task: GenerationTask): task is GenerationTask & { input: ContentTaskInput } {
  return task.type === "content";
}

export function isSelfieTask(task: GenerationTask): task is GenerationTask & { input: SelfieTaskInput } {
  return task.type === "selfie";
}

// Constants
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_PRIORITY = 5;