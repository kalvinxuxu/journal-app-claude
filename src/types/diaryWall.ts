import type { GreetingCard } from "../services/greetingStore";
import type { Journal } from "./journal";
import type { OotdItem } from "./ootd";
import type { HomeAvatarResultRecord } from "./avatarChoiceLoop";

export type OotdCard = {
  id: string;
  kind: string;
  imageUrl: string | null;
  caption: string | null;
  liked?: boolean;
};

export type DiaryWallRenderableItem =
  | { kind: "journal"; date: string; journal: Journal }
  | { kind: "ootd"; date: string; ootd: OotdItem | null; loading?: boolean; error?: string }
  | { kind: "ootd_card"; date: string; ootd: OotdItem; ootdCard: OotdCard; submitCompanionFeedback: (feedback: { userId: string; journalId?: string; feedbackKind: string; feedbackValue: string }) => void; userId: string }
  | { kind: "greeting"; date: string; greeting: GreetingCard | null; pending?: boolean }
  | { kind: "avatar_choice_result"; date: string; result: HomeAvatarResultRecord };