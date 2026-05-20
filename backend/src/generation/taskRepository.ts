import Database from "better-sqlite3";
import type { GenerationTaskRecord } from "./types";

export function createTaskRepository(dbPath: string) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 5,
      input_json TEXT NOT NULL,
      output_json TEXT,
      error_json TEXT,
      result_summary_json TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      available_at TEXT NOT NULL,
      lease_owner TEXT,
      lease_expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_generation_tasks_status_available
    ON generation_tasks(status, available_at, priority, created_at);
    CREATE INDEX IF NOT EXISTS idx_generation_tasks_dedupe
    ON generation_tasks(dedupe_key, status);
  `);

  const rowToTask = (row: Record<string, unknown>): GenerationTaskRecord => ({
    id: String(row.id),
    type: row.type as GenerationTaskRecord["type"],
    status: row.status as GenerationTaskRecord["status"],
    dedupeKey: String(row.dedupe_key),
    priority: Number(row.priority),
    inputJson: String(row.input_json),
    outputJson: row.output_json ? String(row.output_json) : null,
    errorJson: row.error_json ? String(row.error_json) : null,
    resultSummaryJson: row.result_summary_json ? String(row.result_summary_json) : null,
    retryCount: Number(row.retry_count),
    maxRetries: Number(row.max_retries),
    availableAt: String(row.available_at),
    leaseOwner: row.lease_owner ? String(row.lease_owner) : null,
    leaseExpiresAt: row.lease_expires_at ? String(row.lease_expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  });

  return {
    create(task: GenerationTaskRecord) {
      db.prepare(`
        INSERT INTO generation_tasks (
          id, type, status, dedupe_key, priority, input_json, output_json, error_json,
          result_summary_json, retry_count, max_retries, available_at, lease_owner,
          lease_expires_at, created_at, updated_at, started_at, completed_at, cancelled_at
        ) VALUES (
          @id, @type, @status, @dedupeKey, @priority, @inputJson, @outputJson, @errorJson,
          @resultSummaryJson, @retryCount, @maxRetries, @availableAt, @leaseOwner,
          @leaseExpiresAt, @createdAt, @updatedAt, @startedAt, @completedAt, @cancelledAt
        )
      `).run(task);
    },

    getById(id: string) {
      const row = db.prepare(`SELECT * FROM generation_tasks WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
      return row ? rowToTask(row) : null;
    },

    findActiveByDedupeKey(dedupeKey: string) {
      const row = db.prepare(`
        SELECT * FROM generation_tasks
        WHERE dedupe_key = ? AND status IN ('queued', 'leased', 'running')
        ORDER BY created_at ASC
        LIMIT 1
      `).get(dedupeKey) as Record<string, unknown> | undefined;
      return row ? rowToTask(row) : null;
    },

    listAvailable(nowIso: string) {
      const rows = db.prepare(`
        SELECT * FROM generation_tasks
        WHERE status = 'queued' AND available_at <= ?
        ORDER BY priority DESC, created_at ASC
      `).all(nowIso) as Record<string, unknown>[];
      return rows.map(rowToTask);
    },

    leaseNextAvailable(taskType: string, workerId: string, leaseMs: number, nowIso: string) {
      const expiresAt = new Date(new Date(nowIso).getTime() + leaseMs).toISOString();
      const row = db.prepare(`
        SELECT * FROM generation_tasks
        WHERE type = ? AND status = 'queued' AND available_at <= ?
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(taskType, nowIso) as Record<string, unknown> | undefined;

      if (!row) return null;

      db.prepare(`
        UPDATE generation_tasks
        SET status = 'leased', lease_owner = ?, lease_expires_at = ?, updated_at = ?
        WHERE id = ?
      `).run(workerId, expiresAt, nowIso, String(row.id));

      return rowToTask({ ...row, status: "leased", leaseOwner: workerId, leaseExpiresAt: expiresAt });
    },

    updateStatus(id: string, status: string, nowIso: string) {
      db.prepare(`UPDATE generation_tasks SET status = ?, updated_at = ? WHERE id = ?`).run(status, nowIso, id);
    },

    markRunning(id: string, nowIso: string) {
      db.prepare(`UPDATE generation_tasks SET status = 'running', started_at = ?, updated_at = ? WHERE id = ?`).run(nowIso, nowIso, id);
    },

    markSucceeded(id: string, output: Record<string, unknown>, resultSummary: Record<string, unknown>, nowIso: string) {
      db.prepare(`
        UPDATE generation_tasks
        SET status = 'succeeded', output_json = ?, result_summary_json = ?, lease_owner = NULL, lease_expires_at = NULL, updated_at = ?, completed_at = ?
        WHERE id = ?
      `).run(JSON.stringify(output), JSON.stringify(resultSummary), nowIso, nowIso, id);
    },

    markFailed(id: string, error: Record<string, unknown>, nowIso: string) {
      db.prepare(`
        UPDATE generation_tasks
        SET status = 'failed', error_json = ?, lease_owner = NULL, lease_expires_at = NULL, updated_at = ?, completed_at = ?
        WHERE id = ?
      `).run(JSON.stringify(error), nowIso, nowIso, id);
    },

    cancel(id: string, nowIso: string) {
      db.prepare(`
        UPDATE generation_tasks
        SET status = 'cancelled', lease_owner = NULL, lease_expires_at = NULL, updated_at = ?, cancelled_at = ?
        WHERE id = ?
      `).run(nowIso, nowIso, id);
      return this.getById(id);
    },

    markStale(id: string, nowIso: string) {
      db.prepare(`
        UPDATE generation_tasks
        SET status = 'stale', lease_owner = NULL, lease_expires_at = NULL, updated_at = ?
        WHERE id = ?
      `).run(nowIso, id);
    },

    findLeaseExpired(nowIso: string) {
      const rows = db.prepare(`
        SELECT * FROM generation_tasks
        WHERE status IN ('leased', 'running') AND lease_expires_at IS NOT NULL AND lease_expires_at < ?
      `).all(nowIso) as Record<string, unknown>[];
      return rows.map(rowToTask);
    },

    listAll(filter: { status?: string; type?: string }) {
      let sql = "SELECT * FROM generation_tasks WHERE 1=1";
      const params: unknown[] = [];
      if (filter.status) {
        sql += " AND status = ?";
        params.push(filter.status);
      }
      if (filter.type) {
        sql += " AND type = ?";
        params.push(filter.type);
      }
      sql += " ORDER BY created_at DESC";
      const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
      return rows.map(rowToTask);
    },
  };
}
