import type { DiaryWallRenderableItem } from "../../types/diaryWall";
import { JournalWallItem } from "./JournalWallItem";
import { OotdWallItem } from "./OotdWallItem";
import { GreetingWallItem } from "./GreetingWallItem";

export type WallItemRendererProps = {
  item: DiaryWallRenderableItem;
  onJournalRefresh: () => void;
  onOotdRefresh: () => void;
  onGreetingRevealComplete: (id: string) => void;
  isLoading: boolean;
};

export function WallItemRenderer({ item, onJournalRefresh, onOotdRefresh, onGreetingRevealComplete, isLoading }: WallItemRendererProps) {
  switch (item.kind) {
    case "journal":
      return (
        <JournalWallItem
          journal={item.journal}
          onRefresh={onJournalRefresh}
          isLoading={isLoading}
        />
      );
    case "ootd":
      return (
        <OotdWallItem
          ootd={item.ootd}
          loading={item.loading}
          error={item.error}
          onRefresh={onOotdRefresh}
        />
      );
    case "greeting":
      return (
        <GreetingWallItem
          greeting={item.greeting}
          pending={item.pending}
          onRevealComplete={onGreetingRevealComplete}
        />
      );
  }
}