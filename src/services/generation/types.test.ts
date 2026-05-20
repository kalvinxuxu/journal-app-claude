import { describe, it, expect } from 'vitest';
import {
  TaskType,
  TaskStatus,
  TaskError,
  MediaTaskInput,
  ContentTaskInput,
  SelfieTaskInput,
  TaskInput,
  MediaTaskOutput,
  ContentTaskOutput,
  SelfieTaskOutput,
  TaskOutput,
  GenerationTask,
  isMediaTask,
  isContentTask,
  isSelfieTask,
  DEFAULT_MAX_RETRIES,
  DEFAULT_PRIORITY,
} from './types';

describe('GenerationTask Types', () => {
  describe('TaskType', () => {
    it('should allow "media" task type', () => {
      const type: TaskType = "media";
      expect(type).toBe("media");
    });

    it('should allow "content" task type', () => {
      const type: TaskType = "content";
      expect(type).toBe("content");
    });

    it('should allow "selfie" task type', () => {
      const type: TaskType = "selfie";
      expect(type).toBe("selfie");
    });
  });

  describe('TaskStatus', () => {
    it('should have all expected statuses', () => {
      const statuses: TaskStatus[] = ["pending", "running", "success", "failed"];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('TaskError', () => {
    it('should create a valid TaskError object', () => {
      const error: TaskError = {
        code: "NETWORK_ERROR",
        message: "Failed to connect to server",
        retryable: true,
      };
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.retryable).toBe(true);
    });

    it('should support non-retryable errors', () => {
      const error: TaskError = {
        code: "INVALID_INPUT",
        message: "Journal content is empty",
        retryable: false,
      };
      expect(error.retryable).toBe(false);
    });
  });

  describe('MediaTaskInput', () => {
    it('should create a valid media task input', () => {
      const input: MediaTaskInput = {
        journal: {
          id: "journal-123",
          date: "2026-05-16",
          weekday: "Friday",
          mood: "开心",
          content: "今天阳光很好，和女朋友约会了",
          voiceMessages: [
            {
              id: "voice-1",
              timing: "morning",
              transcript: "早上好呀",
              duration: "3.5",
            },
          ],
        },
        referenceImage: "https://example.com/ref.jpg",
        generateSelfies: true,
        voiceStyle: "warm",
      };
      expect(input.journal.id).toBe("journal-123");
      expect(input.generateSelfies).toBe(true);
    });

    it('should work without optional fields', () => {
      const input: MediaTaskInput = {
        journal: {
          id: "journal-456",
          date: "2026-05-15",
          weekday: "Thursday",
          mood: "平静",
          content: "安静的一天",
          voiceMessages: [],
        },
      };
      expect(input.referenceImage).toBeUndefined();
      expect(input.generateSelfies).toBeUndefined();
    });
  });

  describe('ContentTaskInput', () => {
    it('should create a valid content task input', () => {
      const input: ContentTaskInput = {
        mood: "想念",
        date: "2026-05-16",
        recalledMemory: "去年今天我们第一次见面",
        voiceStyle: "soft",
        sceneHint: "咖啡馆",
      };
      expect(input.mood).toBe("想念");
      expect(input.sceneHint).toBe("咖啡馆");
    });

    it('should work with minimal fields', () => {
      const input: ContentTaskInput = {
        mood: "平静",
        date: "2026-05-14",
      };
      expect(input.recalledMemory).toBeUndefined();
    });
  });

  describe('SelfieTaskInput', () => {
    it('should create a valid selfie task input', () => {
      const input: SelfieTaskInput = {
        mood: "开心",
        referenceImage: "https://example.com/selfie-ref.jpg",
        content: "今天去公园玩了",
        date: "2026-05-16",
      };
      expect(input.mood).toBe("开心");
      expect(input.referenceImage).toBeDefined();
    });

    it('should work with only mood', () => {
      const input: SelfieTaskInput = {
        mood: "调皮",
      };
      expect(input.mood).toBe("调皮");
    });
  });

  describe('MediaTaskOutput', () => {
    it('should create a valid media task output', () => {
      const output: MediaTaskOutput = {
        images: ["img1.jpg", "img2.jpg"],
        voiceMessages: [
          {
            id: "voice-out-1",
            timing: "morning",
            transcript: "早安呀",
            duration: "4.2",
          },
        ],
        selfies: {
          morningSelfie: "morning-selfie.jpg",
          eveningSelfie: "evening-selfie.jpg",
        },
      };
      expect(output.images).toHaveLength(2);
      expect(output.selfies?.morningSelfie).toBeDefined();
    });
  });

  describe('ContentTaskOutput', () => {
    it('should create a valid content task output', () => {
      const output: ContentTaskOutput = {
        journalContent: "这是日记内容",
        voiceScripts: [
          { timing: "morning", transcript: "早上好", duration: "3.0" },
          { timing: "night", transcript: "晚安", duration: "5.0" },
        ],
      };
      expect(output.journalContent).toBeDefined();
      expect(output.voiceScripts).toHaveLength(2);
    });
  });

  describe('SelfieTaskOutput', () => {
    it('should create a valid selfie task output', () => {
      const output: SelfieTaskOutput = {
        selfie: "selfie-result.jpg",
      };
      expect(output.selfie).toBe("selfie-result.jpg");
    });

    it('should allow empty output', () => {
      const output: SelfieTaskOutput = {};
      expect(output.selfie).toBeUndefined();
    });
  });

  describe('GenerationTask', () => {
    it('should create a complete generation task', () => {
      const task: GenerationTask = {
        id: "task-001",
        type: "media",
        status: "pending",
        priority: 8,
        input: {
          journal: {
            id: "j1",
            date: "2026-05-16",
            weekday: "Friday",
            mood: "开心",
            content: "测试内容",
            voiceMessages: [],
          },
        },
        output: {
          images: ["test.jpg"],
        },
        retryCount: 0,
        maxRetries: DEFAULT_MAX_RETRIES,
        createdAt: "2026-05-16T10:00:00Z",
        updatedAt: "2026-05-16T10:00:00Z",
        startedAt: "2026-05-16T10:01:00Z",
        completedAt: "2026-05-16T10:05:00Z",
      };
      expect(task.id).toBe("task-001");
      expect(task.type).toBe("media");
      expect(task.status).toBe("pending");
      expect(task.maxRetries).toBe(DEFAULT_MAX_RETRIES);
    });

    it('should support failed task with error', () => {
      const task: GenerationTask = {
        id: "task-002",
        type: "content",
        status: "failed",
        priority: DEFAULT_PRIORITY,
        input: {
          mood: "想念",
          date: "2026-05-16",
        },
        error: {
          code: "API_ERROR",
          message: "Content API unavailable",
          retryable: true,
        },
        retryCount: 2,
        maxRetries: 3,
        createdAt: "2026-05-16T09:00:00Z",
        updatedAt: "2026-05-16T09:30:00Z",
      };
      expect(task.status).toBe("failed");
      expect(task.error?.code).toBe("API_ERROR");
      expect(task.retryCount).toBe(2);
    });
  });

  describe('Type guards', () => {
    it('isMediaTask should return true for media tasks', () => {
      const task: GenerationTask = {
        id: "t1",
        type: "media",
        status: "pending",
        priority: 5,
        input: {
          journal: {
            id: "j1",
            date: "2026-05-16",
            weekday: "Friday",
            mood: "开心",
            content: "test",
            voiceMessages: [],
          },
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: "2026-05-16T10:00:00Z",
        updatedAt: "2026-05-16T10:00:00Z",
      };
      expect(isMediaTask(task)).toBe(true);
      expect(isContentTask(task)).toBe(false);
      expect(isSelfieTask(task)).toBe(false);
    });

    it('isContentTask should return true for content tasks', () => {
      const task: GenerationTask = {
        id: "t2",
        type: "content",
        status: "pending",
        priority: 5,
        input: {
          mood: "平静",
          date: "2026-05-16",
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: "2026-05-16T10:00:00Z",
        updatedAt: "2026-05-16T10:00:00Z",
      };
      expect(isMediaTask(task)).toBe(false);
      expect(isContentTask(task)).toBe(true);
      expect(isSelfieTask(task)).toBe(false);
    });

    it('isSelfieTask should return true for selfie tasks', () => {
      const task: GenerationTask = {
        id: "t3",
        type: "selfie",
        status: "pending",
        priority: 5,
        input: {
          mood: "开心",
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: "2026-05-16T10:00:00Z",
        updatedAt: "2026-05-16T10:00:00Z",
      };
      expect(isMediaTask(task)).toBe(false);
      expect(isContentTask(task)).toBe(false);
      expect(isSelfieTask(task)).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should export correct DEFAULT_MAX_RETRIES', () => {
      expect(DEFAULT_MAX_RETRIES).toBe(3);
    });

    it('should export correct DEFAULT_PRIORITY', () => {
      expect(DEFAULT_PRIORITY).toBe(5);
    });
  });

  describe('Type narrowing with union types', () => {
    it('should accept any TaskInput subtype', () => {
      const mediaInput: TaskInput = {
        journal: {
          id: "j1",
          date: "2026-05-16",
          weekday: "Friday",
          mood: "开心",
          content: "test",
          voiceMessages: [],
        },
      };
      expect(mediaInput).toBeDefined();

      const contentInput: TaskInput = {
        mood: "想念",
        date: "2026-05-16",
      };
      expect(contentInput).toBeDefined();

      const selfieInput: TaskInput = {
        mood: "平静",
      };
      expect(selfieInput).toBeDefined();
    });

    it('should accept any TaskOutput subtype', () => {
      const mediaOutput: TaskOutput = { images: ["test.jpg"] };
      expect(mediaOutput).toBeDefined();

      const contentOutput: TaskOutput = {
        journalContent: "content",
        voiceScripts: [],
      };
      expect(contentOutput).toBeDefined();

      const selfieOutput: TaskOutput = { selfie: "selfie.jpg" };
      expect(selfieOutput).toBeDefined();
    });
  });
});