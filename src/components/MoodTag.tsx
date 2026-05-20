import type { Mood } from "../types/journal";

const moodMap: Record<Mood, { emoji: string; className: string }> = {
  开心: { emoji: "❤️", className: "mood mood-happy" },
  想念: { emoji: "🌙", className: "mood mood-miss" },
  感动: { emoji: "💧", className: "mood mood-touched" },
  平静: { emoji: "🍃", className: "mood mood-calm" },
  调皮: { emoji: "✨", className: "mood mood-playful" },
};

type MoodTagProps = {
  mood: Mood;
};

export function MoodTag({ mood }: MoodTagProps) {
  const entry = moodMap[mood];

  return (
    <span className={entry.className}>
      <span>{entry.emoji}</span>
      <span>{mood}</span>
    </span>
  );
}
