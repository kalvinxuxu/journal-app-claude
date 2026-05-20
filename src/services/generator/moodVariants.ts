import type { Mood } from "../../types/journal";

export type MoodVariant = {
  tag: string;
  weight: number;
  description: string;
};

type MoodVariantLibrary = Record<Mood, MoodVariant[]>;

const moodVariants: MoodVariantLibrary = {
  "开心": [
    { tag: "雀跃", weight: 0.3, description: "蹦蹦跳跳的开心" },
    { tag: "满足", weight: 0.4, description: "平静的满足感" },
    { tag: "傻乐", weight: 0.3, description: "呆呆的开心" },
  ],
  "想念": [
    { tag: "淡淡的", weight: 0.4, description: "轻轻淡淡的思念" },
    { tag: "浓烈的", weight: 0.3, description: "很强烈的想念" },
    { tag: "撒娇的", weight: 0.3, description: "带点撒娇的想念" },
  ],
  "感动": [
    { tag: "温暖的", weight: 0.4, description: "温柔感动的" },
    { tag: "哽咽的", weight: 0.3, description: "有点想哭的感动" },
    { tag: "释然的", weight: 0.3, description: "放下之后的感动" },
  ],
  "平静": [
    { tag: "慵懒的", weight: 0.4, description: "懒洋洋的平静" },
    { tag: "内敛的", weight: 0.3, description: "向内的平静" },
    { tag: "清澈的", weight: 0.3, description: "清明澄澈的平静" },
  ],
  "调皮": [
    { tag: "得意的", weight: 0.4, description: "小得意的调皮" },
    { tag: "恶作剧的", weight: 0.3, description: "想捉弄你的调皮" },
    { tag: "撒娇的", weight: 0.3, description: "撒娇式的调皮" },
  ],
};

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

export function selectMoodVariant(mood: Mood): MoodVariant {
  const variants = moodVariants[mood];
  return weightedRandom(variants);
}

export function getAllVariants(mood: Mood): MoodVariant[] {
  return moodVariants[mood];
}