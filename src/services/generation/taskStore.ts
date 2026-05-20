import { GenerationTask, TaskStatus, TaskType } from './types';

const STORAGE_KEY = 'journal-app:generation-tasks';

interface TaskStore {
  loadTasks(): GenerationTask[];
  saveTasks(tasks: GenerationTask[]): void;
  upsertTask(task: GenerationTask): void;
  getTask(id: string): GenerationTask | null;
  deleteTask(id: string): void;
  getTasksByStatus(status: TaskStatus): GenerationTask[];
  getTasksByType(type: TaskType): GenerationTask[];
}

// In-memory cache for tasks
let tasksCache: GenerationTask[] = [];

/**
 * Load all tasks from localStorage
 * Returns empty array if localStorage is unavailable or corrupted
 */
function loadTasks(): GenerationTask[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      tasksCache = [];
      return [];
    }
    const parsed = JSON.parse(data) as GenerationTask[];
    tasksCache = parsed;
    return parsed;
  } catch {
    // localStorage unavailable or corrupted - return empty array
    tasksCache = [];
    return [];
  }
}

/**
 * Save all tasks to localStorage
 * Silently fails if localStorage is unavailable
 */
function saveTasks(tasks: GenerationTask[]): void {
  try {
    tasksCache = tasks;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage unavailable - fail silently
  }
}

/**
 * Insert or update a task
 * Finds existing task by id and updates, or adds new if not found
 * Persists immediately after modification
 */
function upsertTask(task: GenerationTask): void {
  const tasks = loadTasks();
  const existingIndex = tasks.findIndex((t) => t.id === task.id);

  if (existingIndex >= 0) {
    tasks[existingIndex] = task;
  } else {
    tasks.push(task);
  }

  saveTasks(tasks);
}

/**
 * Get a single task by id
 * Returns null if not found
 */
function getTask(id: string): GenerationTask | null {
  const tasks = loadTasks();
  return tasks.find((t) => t.id === id) || null;
}

/**
 * Delete a task by id
 * Does nothing if task not found
 */
function deleteTask(id: string): void {
  const tasks = loadTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  saveTasks(filtered);
}

/**
 * Get tasks filtered by status
 */
function getTasksByStatus(status: TaskStatus): GenerationTask[] {
  const tasks = loadTasks();
  return tasks.filter((t) => t.status === status);
}

/**
 * Get tasks filtered by type
 */
function getTasksByType(type: TaskType): GenerationTask[] {
  const tasks = loadTasks();
  return tasks.filter((t) => t.type === type);
}

// Initialize cache on module import
loadTasks();

export const taskStore: TaskStore = {
  loadTasks,
  saveTasks,
  upsertTask,
  getTask,
  deleteTask,
  getTasksByStatus,
  getTasksByType,
};

export default taskStore;