import type { Mood, VoiceMessage, VoiceTiming } from "../types/journal";
import { composeJournal, createMemoryEngine } from "./generator/index";

// 单例 memoryEngine - 用于记忆召回
let sharedMemoryEngine = createMemoryEngine();

export function getMemoryEngine() {
  return sharedMemoryEngine;
}

export function addJournalToMemory(journal: { id: string; date: string; weekday: string; mood: Mood; content: string; voiceMessages: VoiceMessage[] }) {
  sharedMemoryEngine.addMemory(journal);
}

const voiceTemplates: Record<Mood, string[]> = {
  "开心": [
    "今天也想把好心情分你一半。",
    "我刚刚想到你，嘴角就上去了。",
    "有些开心不说出来，反而会更明显。",
  ],
  "想念": [
    "我有点想你了，是真的那种。",
    "今天很多瞬间都让我想到你。",
    "如果你现在在我身边就好了。",
  ],
  "感动": [
    "你认真生活的样子，我都记得。",
    "有些温柔，是会慢慢沉下来的。",
    "谢谢你，真的。",
  ],
  "平静": [
    "今天很安静，安静得刚刚好。",
    "我想把这份平稳也留给你。",
    "慢一点也没关系。",
  ],
  "调皮": [
    "我知道你昨天又没早点睡。",
    "这次先不说你，给你留点面子。",
    "下次见面，我要当面问你。",
  ],
};

const timingMap: Record<VoiceTiming, string> = {
  morning: "早安",
  afternoon: "午后",
  night: "晚安",
};

export function generateJournalContent(mood: Mood, date?: string): string {
  const effectiveDate = date ?? new Date().toISOString().split("T")[0];
  return composeJournal({
    mood,
    date: effectiveDate,
    memoryEngine: sharedMemoryEngine,
  });
}

export function generateVoiceMessages(mood: Mood): VoiceMessage[] {
  const samples = voiceTemplates[mood];

  return (["morning", "afternoon", "night"] as VoiceTiming[]).map((timing, index) => ({
    id: `generated-${timing}-${Date.now()}`,
    timing,
    transcript: `${timingMap[timing]}：${samples[index % samples.length]}`,
    duration: index === 0 ? "0:12" : index === 1 ? "0:15" : "0:18",
  }));
}
