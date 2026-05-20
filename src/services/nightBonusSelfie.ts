import type { Mood } from "../types/journal";

export function shouldGenerateNightBonus({
  hour,
  hasNightBonusSelfie,
}: {
  hour: number;
  hasNightBonusSelfie: boolean;
}): boolean {
  return hour >= 21 && !hasNightBonusSelfie;
}

export function buildNightBonusPrompt(mood: Mood): string {
  return `睡衣自拍，甜心感，更像晚上专门拍给你的照片。心情：${mood}`;
}