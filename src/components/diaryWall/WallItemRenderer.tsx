import type { DiaryWallRenderableItem } from "../../types/diaryWall";
import { JournalWallItem } from "./JournalWallItem";
import { OotdWallItem } from "./OotdWallItem";
import { OotdCardWallItem } from "./OotdCardWallItem";
import { GreetingWallItem } from "./GreetingWallItem";
import { AvatarChoiceResultWallItem } from "./AvatarChoiceResultWallItem";

export type WallItemRendererProps = {
  item: DiaryWallRenderableItem;
  onJournalRefresh: () => void;
  onOotdRefresh: () => void;
  onGreetingRevealComplete: (id: string) => void;
  isLoading: boolean;
  submitCompanionFeedback: (payload: {
    userId: string;
    journalId?: string;
    feedbackKind: string;
    feedbackValue: string;
  }) => void;
  userId: string;
};

export function WallItemRenderer({ item, onJournalRefresh, onOotdRefresh, onGreetingRevealComplete, isLoading, submitCompanionFeedback, userId }: WallItemRendererProps) {
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
          submitCompanionFeedback={submitCompanionFeedback}
          userId={userId}
        />
      );
    case "ootd_card":
      return (
        <OotdCardWallItem
          ootd={item.ootd}
          ootdCard={item.ootdCard}
          onRefresh={onOotdRefresh}
          submitCompanionFeedback={submitCompanionFeedback}
          userId={userId}
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
    case "avatar_choice_result":
      return (
        <AvatarChoiceResultWallItem result={item.result} />
      );
  }
}