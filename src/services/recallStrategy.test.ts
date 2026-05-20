import { describe, it, expect } from "vitest";
import { createMemoryEngine } from "./generator/index";
import { recallWithStrategy, type RecallStrategy } from "./recallStrategy";

describe("recallWithStrategy", () => {
  it('returns "direct" when same-mood memory exists within 7 days', () => {
    const engine = createMemoryEngine();
    engine.addMemory({
      id: "j1",
      date: "2026-05-10",
      mood: "开心",
      content: "今天和他一起逛街，他送了我一束花，心情特别好。",
    });

    const result = recallWithStrategy(engine, "开心", "2026-05-14");
    expect(result.strategy).toBe("direct");
    expect(result.entries).toHaveLength(1);
  });

  it('returns "emotional_echo" when same-mood memory is older than 7 days', () => {
    const engine = createMemoryEngine();
    engine.addMemory({
      id: "j1",
      date: "2026-05-01",
      mood: "开心",
      content: "今天阳光很好，心情不错。",
    });

    const result = recallWithStrategy(engine, "开心", "2026-05-14");
    expect(result.strategy).toBe("emotional_echo");
    expect(result.entries).toHaveLength(1);
  });

  it('returns "contrasting" when no same-mood memory exists', () => {
    const engine = createMemoryEngine();
    engine.addMemory({
      id: "j1",
      date: "2026-05-10",
      mood: "平静",
      content: "今天很安静，一个人喝茶。",
    });

    const result = recallWithStrategy(engine, "开心", "2026-05-14");
    expect(result.strategy).toBe("contrasting");
    expect(result.entries).toHaveLength(1);
  });

  it('returns "no_memory" when no entries at all', () => {
    const engine = createMemoryEngine();
    const result = recallWithStrategy(engine, "开心", "2026-05-14");
    expect(result.strategy).toBe("no_memory");
    expect(result.entries).toHaveLength(0);
  });

  it("limits entries to specified count", () => {
    const engine = createMemoryEngine();
    engine.addMemory({ id: "j1", date: "2026-05-10", mood: "开心", content: "今天很开心1" });
    engine.addMemory({ id: "j2", date: "2026-05-11", mood: "开心", content: "今天很开心2" });
    engine.addMemory({ id: "j3", date: "2026-05-12", mood: "开心", content: "今天很开心3" });
    engine.addMemory({ id: "j4", date: "2026-05-13", mood: "开心", content: "今天很开心4" });

    const result = recallWithStrategy(engine, "开心", "2026-05-14", 2);
    expect(result.entries).toHaveLength(2);
  });

  it("uses most recent same-mood entries for strategy determination", () => {
    const engine = createMemoryEngine();
    engine.addMemory({ id: "j1", date: "2026-05-01", mood: "开心", content: "老记忆" });
    engine.addMemory({ id: "j2", date: "2026-05-13", mood: "开心", content: "新记忆" });

    const result = recallWithStrategy(engine, "开心", "2026-05-14");
    expect(result.strategy).toBe("direct");
    expect(result.entries[0].date).toBe("2026-05-13");
  });
});