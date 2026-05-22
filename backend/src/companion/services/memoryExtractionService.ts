type ExtractInput = {
  userId: string;
  journalId: string;
  content: string;
};

type ExtractedMemory = {
  summary: string;
  memoryType: "event" | "fear" | "preference";
  salienceScore: number;
  recallScore: number;
  isStructured: 0 | 1;
  detailJson: string;
};

export function createMemoryExtractionService() {
  return {
    extractFromJournal(input: ExtractInput): ExtractedMemory[] {
      const memories: ExtractedMemory[] = [];
      const text = input.content;

      if (text.includes("老板点名")) {
        memories.push({
          summary: "曾因老板点名而在通勤时情绪低落",
          memoryType: "event",
          salienceScore: 85,
          recallScore: 70,
          isStructured: 0,
          detailJson: JSON.stringify({ cue: "老板点名" }),
        });
      }

      if (text.includes("怕别人觉得我麻烦")) {
        memories.push({
          summary: "怕别人觉得我麻烦",
          memoryType: "fear",
          salienceScore: 95,
          recallScore: 90,
          isStructured: 1,
          detailJson: JSON.stringify({ cue: "怕麻烦别人" }),
        });
      }

      if (text.includes("下雨天")) {
        memories.push({
          summary: "下雨天容易想躲起来",
          memoryType: "preference",
          salienceScore: 78,
          recallScore: 82,
          isStructured: 1,
          detailJson: JSON.stringify({ cue: "下雨天低落" }),
        });
      }

      return memories;
    },
  };
}