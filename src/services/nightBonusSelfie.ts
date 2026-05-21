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
  return `Only one person in the image. 夜晚室内全身竖屏自拍，睡衣或柔软居家睡裙，慵懒、亲密、轻性感、晚安氛围，暖色床头灯，真实生活感，轻裸露，适当暴露。黑色丝性感但不打擦边的黑丝睡裙，轻微挑逗心情：${mood}`;
}