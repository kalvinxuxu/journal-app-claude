import type { Journal } from "./journal";
import type { OotdItem } from "../services/api/companionClient";
import type { GreetingCard } from "../services/greetingStore";

export type DiaryWallRenderableItem =
  | { kind: "journal"; date: string; journal: Journal }
  | { kind: "ootd"; date: string; ootd: OotdItem | null; loading?: boolean; error?: string }
  | { kind: "greeting"; date: string; greeting: GreetingCard | null; pending?: boolean };