type RecallCandidate = {
  summary: string;
  recallScore: number;
  salienceScore: number;
  memoryType: string;
};

export function createMemoryRecallService() {
  return {
    selectForJournal(memories: RecallCandidate[], limit = 3) {
      return [...memories]
        .sort((a, b) => {
          const left = a.recallScore * 2 + a.salienceScore;
          const right = b.recallScore * 2 + b.salienceScore;
          return right - left;
        })
        .slice(0, limit);
    },
  };
}