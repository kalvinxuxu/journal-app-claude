import { createMemoryRecallService } from "./memoryRecallService";

export function createJournalContextBuilder() {
  const recallService = createMemoryRecallService();

  return {
    build(memoryItems: Array<{ summary: string; recallScore: number; salienceScore: number; memoryType: string }>) {
      const selected = recallService.selectForJournal(memoryItems, 3);
      return {
        recalledMemory: selected.map((item) => item.summary).join("；"),
        echoCandidates: selected,
      };
    },
  };
}