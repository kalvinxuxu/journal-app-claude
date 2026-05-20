export function createTaskRecovery(repository: {
  findLeaseExpired(nowIso: string): Array<{ id: string }>;
  markStale(id: string, nowIso: string): void;
}) {
  return {
    scan(nowIso: string) {
      for (const task of repository.findLeaseExpired(nowIso)) {
        repository.markStale(task.id, nowIso);
      }
    },
  };
}