import { describe, expect, it, vi } from "vitest";
import { createTaskScheduler } from "./taskScheduler";
import { createTaskRecovery } from "./taskRecovery";

describe("taskScheduler", () => {
  it("leases only one media task when media concurrency is 1", async () => {
    const repository = {
      leaseNextAvailable: vi
        .fn()
        .mockReturnValueOnce({ id: "media-1", type: "media_generation" })
        .mockReturnValueOnce({ id: "media-2", type: "media_generation" })
        .mockReturnValueOnce(null),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const runners = {
      media_generation: vi.fn().mockResolvedValue({ output: { images: [] }, resultSummary: { outcome: "full_success" } }),
    };

    const scheduler = createTaskScheduler({
      repository: repository as never,
      runners: runners as never,
      concurrency: { draft_generation: 2, media_generation: 1, selfie_generation: 1 },
      leaseMs: 30_000,
      workerId: "worker-1",
    });

    await scheduler.tick();

    expect(runners.media_generation).toHaveBeenCalledTimes(1);
  });

  it("requeues a lease-expired task as stale", async () => {
    const repository = {
      findLeaseExpired: vi.fn().mockReturnValue([{ id: "tsk-stale-1" }]),
      markStale: vi.fn(),
    };

    const recovery = createTaskRecovery(repository as never);
    recovery.scan("2026-05-17T10:30:00.000Z");

    expect(repository.markStale).toHaveBeenCalledWith("tsk-stale-1", "2026-05-17T10:30:00.000Z");
  });
});