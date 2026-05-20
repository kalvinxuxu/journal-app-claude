import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { taskStore } from './taskStore';
import { GenerationTask, TaskStatus, TaskType } from './types';

const STORAGE_KEY = 'journal-app:generation-tasks';

// Helper to create a mock task
function createMockTask(overrides: Partial<GenerationTask> = {}): GenerationTask {
  return {
    id: 'task-001',
    type: 'media',
    status: 'pending',
    priority: 5,
    input: {
      journal: {
        id: 'journal-123',
        date: '2026-05-16',
        weekday: 'Friday',
        mood: '开心',
        content: '测试内容',
        voiceMessages: [],
      },
    },
    retryCount: 0,
    maxRetries: 3,
    createdAt: '2026-05-16T10:00:00Z',
    updatedAt: '2026-05-16T10:00:00Z',
    ...overrides,
  };
}

// Helper to clear localStorage
function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

describe('taskStore', () => {
  beforeEach(() => {
    clearStorage();
    // Re-initialize the store by calling loadTasks
    taskStore.loadTasks();
  });

  afterEach(() => {
    clearStorage();
  });

  describe('loadTasks', () => {
    it('should return empty array when localStorage is empty', () => {
      const tasks = taskStore.loadTasks();
      expect(tasks).toEqual([]);
    });

    it('should load tasks from localStorage', () => {
      const mockTask = createMockTask({ id: 'task-load-test' });
      taskStore.saveTasks([mockTask]);

      const tasks = taskStore.loadTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-load-test');
    });

    it('should return empty array when localStorage is corrupted', () => {
      try {
        localStorage.setItem(STORAGE_KEY, 'invalid-json{');
      } catch {
        // localStorage not available
      }

      const tasks = taskStore.loadTasks();
      expect(tasks).toEqual([]);
    });

    it('should return empty array when localStorage is unavailable', () => {
      // This test verifies graceful handling when localStorage throws
      const originalGetItem = localStorage.getItem;
      try {
        // Simulate localStorage being unavailable
        Object.defineProperty(localStorage, 'getItem', {
          value: () => { throw new Error('localStorage not available'); },
          configurable: true,
        });

        const tasks = taskStore.loadTasks();
        expect(tasks).toEqual([]);
      } finally {
        Object.defineProperty(localStorage, 'getItem', { value: originalGetItem });
      }
    });
  });

  describe('saveTasks', () => {
    it('should save tasks to localStorage', () => {
      const mockTasks = [
        createMockTask({ id: 'task-save-1' }),
        createMockTask({ id: 'task-save-2' }),
      ];

      taskStore.saveTasks(mockTasks);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
    });

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      try {
        Object.defineProperty(localStorage, 'setItem', {
          value: () => { throw new Error('localStorage full'); },
          configurable: true,
        });

        // Should not throw
        expect(() => taskStore.saveTasks([])).not.toThrow();
      } finally {
        Object.defineProperty(localStorage, 'setItem', { value: originalSetItem });
      }
    });
  });

  describe('upsertTask', () => {
    it('should add a new task when id does not exist', () => {
      const mockTask = createMockTask({ id: 'task-upsert-new' });

      taskStore.upsertTask(mockTask);

      const tasks = taskStore.loadTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-upsert-new');
    });

    it('should update existing task when id exists', () => {
      const originalTask = createMockTask({
        id: 'task-upsert-existing',
        status: 'pending',
        priority: 5,
      });
      taskStore.upsertTask(originalTask);

      const updatedTask = createMockTask({
        id: 'task-upsert-existing',
        status: 'running',
        priority: 10,
      });
      taskStore.upsertTask(updatedTask);

      const tasks = taskStore.loadTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('running');
      expect(tasks[0].priority).toBe(10);
    });

    it('should persist immediately after upsert', () => {
      const mockTask = createMockTask({ id: 'task-upsert-persist' });

      taskStore.upsertTask(mockTask);

      // Reload to verify persistence
      const tasks = taskStore.loadTasks();
      expect(tasks[0].id).toBe('task-upsert-persist');
    });
  });

  describe('getTask', () => {
    it('should return task when found', () => {
      const mockTask = createMockTask({ id: 'task-get-found' });
      taskStore.saveTasks([mockTask]);

      const found = taskStore.getTask('task-get-found');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('task-get-found');
    });

    it('should return null when task not found', () => {
      const found = taskStore.getTask('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete task by id', () => {
      const mockTask = createMockTask({ id: 'task-delete-1' });
      taskStore.saveTasks([mockTask]);

      taskStore.deleteTask('task-delete-1');

      const tasks = taskStore.loadTasks();
      expect(tasks).toHaveLength(0);
    });

    it('should do nothing when deleting non-existent task', () => {
      const mockTask = createMockTask({ id: 'task-delete-2' });
      taskStore.saveTasks([mockTask]);

      taskStore.deleteTask('non-existent-id');

      const tasks = taskStore.loadTasks();
      expect(tasks).toHaveLength(1);
    });

    it('should persist after delete', () => {
      const mockTask = createMockTask({ id: 'task-delete-persist' });
      taskStore.saveTasks([mockTask]);

      taskStore.deleteTask('task-delete-persist');

      // Reload to verify persistence
      const tasks = taskStore.loadTasks();
      expect(tasks).toHaveLength(0);
    });
  });

  describe('getTasksByStatus', () => {
    it('should return only tasks with matching status', () => {
      const tasks: GenerationTask[] = [
        createMockTask({ id: 'task-pending', status: 'pending' }),
        createMockTask({ id: 'task-running', status: 'running' }),
        createMockTask({ id: 'task-success', status: 'success' }),
        createMockTask({ id: 'task-failed', status: 'failed' }),
        createMockTask({ id: 'task-pending-2', status: 'pending' }),
      ];
      taskStore.saveTasks(tasks);

      const pendingTasks = taskStore.getTasksByStatus('pending');
      expect(pendingTasks).toHaveLength(2);
      expect(pendingTasks.every((t) => t.status === 'pending')).toBe(true);

      const successTasks = taskStore.getTasksByStatus('success');
      expect(successTasks).toHaveLength(1);
      expect(successTasks[0].id).toBe('task-success');
    });

    it('should return empty array when no tasks match status', () => {
      const tasks: GenerationTask[] = [
        createMockTask({ id: 'task-pending', status: 'pending' }),
      ];
      taskStore.saveTasks(tasks);

      const failedTasks = taskStore.getTasksByStatus('failed');
      expect(failedTasks).toHaveLength(0);
    });
  });

  describe('getTasksByType', () => {
    it('should return only tasks with matching type', () => {
      const tasks: GenerationTask[] = [
        createMockTask({ id: 'task-media', type: 'media' }),
        createMockTask({ id: 'task-content', type: 'content' }),
        createMockTask({ id: 'task-selfie', type: 'selfie' }),
        createMockTask({ id: 'task-media-2', type: 'media' }),
      ];
      taskStore.saveTasks(tasks);

      const mediaTasks = taskStore.getTasksByType('media');
      expect(mediaTasks).toHaveLength(2);
      expect(mediaTasks.every((t) => t.type === 'media')).toBe(true);

      const selfieTasks = taskStore.getTasksByType('selfie');
      expect(selfieTasks).toHaveLength(1);
      expect(selfieTasks[0].id).toBe('task-selfie');
    });

    it('should return empty array when no tasks match type', () => {
      const tasks: GenerationTask[] = [
        createMockTask({ id: 'task-media', type: 'media' }),
      ];
      taskStore.saveTasks(tasks);

      const contentTasks = taskStore.getTasksByType('content');
      expect(contentTasks).toHaveLength(0);
    });
  });

  describe('module initialization', () => {
    it('should load tasks on module import', () => {
      // This is implicitly tested - if loadTasks works, the module init worked
      const tasks = taskStore.loadTasks();
      expect(Array.isArray(tasks)).toBe(true);
    });
  });
});