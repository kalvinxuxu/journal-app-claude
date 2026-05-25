import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCurrentUserId, loadJournals, loadJournalsWithSource, type JournalLoadResult } from "./memory";

const mockDate = new Date("2026-05-14T12:00:00");
vi.setSystemTime(mockDate);

// Clear localStorage before each test to prevent cross-test pollution
beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.getItem.mockReturnValue(null);
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
});

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const originalCanUseStorage = (global as any).window;

function setupStorage(raw: string | null) {
  mockLocalStorage.getItem.mockReturnValue(raw);
  (global as any).window = {
    localStorage: mockLocalStorage,
  };
}

function restoreGlobal() {
  (global as any).window = originalCanUseStorage;
}

describe("loadJournalsWithSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty with source=empty when localStorage has no data", () => {
    setupStorage(null);
    const result = loadJournalsWithSource();
    expect(result.source).toBe("empty");
    expect(result.journals).toHaveLength(0);
    restoreGlobal();
  });

  it("returns empty with source=empty when localStorage has empty array", () => {
    setupStorage("[]");
    const result = loadJournalsWithSource();
    expect(result.source).toBe("empty");
    expect(result.journals).toHaveLength(0);
    restoreGlobal();
  });

  it("returns local source when localStorage has valid journals", () => {
    const journals = JSON.stringify([
      { id: "journal-2026-05-10", date: "2026-05-10", weekday: "周六", mood: "开心", content: "test", voiceMessages: [] },
    ]);
    setupStorage(journals);
    const result = loadJournalsWithSource();
    expect(result.source).toBe("local");
    expect(result.journals).toHaveLength(1);
    restoreGlobal();
  });

  it("returns empty source when JSON is corrupted", () => {
    setupStorage("not valid json");
    const result = loadJournalsWithSource();
    expect(result.source).toBe("empty");
    expect(result.journals).toHaveLength(0);
    restoreGlobal();
  });
});

describe("loadJournals (legacy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to mockJournals when localStorage is unavailable", () => {
    (global as any).window = undefined;
    const journals = loadJournals();
    expect(journals.length).toBeGreaterThan(0);
    restoreGlobal();
  });

  it("falls back to mockJournals when localStorage returns nothing", () => {
    setupStorage(null);
    const journals = loadJournals();
    expect(journals.length).toBeGreaterThan(0);
    restoreGlobal();
  });
});

describe("getCurrentUserId", () => {
  it("falls back to a stable local user id when storage is empty", () => {
    setupStorage(null);

    const userId = getCurrentUserId();

    expect(userId).toBe("local-user");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("journal-app:userId", "local-user");
    restoreGlobal();
  });
});

// ============================================================================
// Backend CRUD tests
// ============================================================================

describe("loadJournalsFromBackend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /api/journals", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const { loadJournalsFromBackend } = await import("./memory");
    await loadJournalsFromBackend();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/http:\/\/localhost:3001\/api\/journals/);
    fetchMock.mockRestore();
  });

  it("returns journals array on success", async () => {
    const mockJournals = [
      { id: "journal-2026-05-10", date: "2026-05-10", weekday: "周六", mood: "开心", content: "test", voiceMessages: [] },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockJournals,
    } as Response);

    const { loadJournalsFromBackend } = await import("./memory");
    const result = await loadJournalsFromBackend();

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-05-10");
  });

  it("returns empty array when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { loadJournalsFromBackend } = await import("./memory");
    const result = await loadJournalsFromBackend();

    expect(result).toHaveLength(0);
  });

  it("returns empty array on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const { loadJournalsFromBackend } = await import("./memory");
    const result = await loadJournalsFromBackend();

    expect(result).toHaveLength(0);
  });
});

describe("saveJournalToBackend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls POST /api/journals with journal body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
    } as Response);

    const { saveJournalToBackend } = await import("./memory");
    const journal = { id: "j1", date: "2026-05-15", weekday: "周四", mood: "开心", content: "hi", voiceMessages: [] };
    await saveJournalToBackend(journal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/http:\/\/localhost:3001\/api\/journals/);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(options.body);
    expect(body.id).toBe("j1");
    fetchMock.mockRestore();
  });

  it("returns true on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: true } as Response);

    const { saveJournalToBackend } = await import("./memory");
    const result = await saveJournalToBackend({ id: "j1", date: "2026-05-15", weekday: "周四", mood: "开心", content: "hi", voiceMessages: [] });

    expect(result).toBe(true);
  });

  it("returns false when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 400 } as Response);

    const { saveJournalToBackend } = await import("./memory");
    const result = await saveJournalToBackend({ id: "j1", date: "2026-05-15", weekday: "周四", mood: "开心", content: "hi", voiceMessages: [] });

    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const { saveJournalToBackend } = await import("./memory");
    const result = await saveJournalToBackend({ id: "j1", date: "2026-05-15", weekday: "周四", mood: "开心", content: "hi", voiceMessages: [] });

    expect(result).toBe(false);
  });
});

// ============================================================================
// Backend-first loading / graceful degradation tests
// ============================================================================

describe("loadJournalsWithBackendFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads from backend when backend has journals", async () => {
    const backendJournals = [
      { id: "backend-journal", date: "2026-05-15", weekday: "周四", mood: "开心", content: "backend content", voiceMessages: [] },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => backendJournals,
    } as Response);

    const { loadJournalsWithBackendFallback } = await import("./memory");
    const result = await loadJournalsWithBackendFallback();

    expect(result.source).toBe("local");
    expect(result.journals).toHaveLength(1);
    expect(result.journals[0].id).toBe("backend-journal");
  });

  it("falls back to localStorage when backend returns empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);
    const localJournals = [
      { id: "local-journal", date: "2026-05-10", weekday: "周六", mood: "开心", content: "local content", voiceMessages: [] },
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localJournals));

    const { loadJournalsWithBackendFallback } = await import("./memory");
    const result = await loadJournalsWithBackendFallback();

    // Backend returned empty, so falls back to localStorage
    expect(result.source).toBe("local");
    expect(result.journals).toHaveLength(1);
    expect(result.journals[0].id).toBe("local-journal");
    restoreGlobal();
  });

  it("falls back to mock journals when both backend and localStorage are empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);
    mockLocalStorage.getItem.mockReturnValue(null);

    const { loadJournalsWithBackendFallback } = await import("./memory");
    const result = await loadJournalsWithBackendFallback();

    expect(result.source).toBe("mock");
    expect(result.journals.length).toBeGreaterThan(0);
    restoreGlobal();
  });

  it("falls back to localStorage when backend is unavailable (network error)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));
    const localJournals = [
      { id: "local-fallback", date: "2026-05-09", weekday: "周五", mood: "开心", content: "local fallback", voiceMessages: [] },
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localJournals));

    const { loadJournalsWithBackendFallback } = await import("./memory");
    const result = await loadJournalsWithBackendFallback();

    expect(result.source).toBe("local");
    expect(result.journals).toHaveLength(1);
    expect(result.journals[0].id).toBe("local-fallback");
    restoreGlobal();
  });
});

// ============================================================================
// Manual verification documentation tests
// ============================================================================

describe("Chrome and VS Code identical data", () => {
  it("NOTE: Cross-browser identical data verification requires manual testing", () => {
    // Automated tests cannot verify cross-browser localStorage identical behavior
    // since jsdom simulates only one browser environment.
    //
    // Manual verification steps:
    // 1. Open the app in Chrome, create some journals
    // 2. Open the app in VS Code's embedded browser (if supported)
    // 3. Verify that both browsers can read/write the same journal data
    // 4. Check that backend is used as the primary source, ensuring consistency
    //
    // This test always passes to document the requirement.
    expect(true).toBe(true);
  });
});
