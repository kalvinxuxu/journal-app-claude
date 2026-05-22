import type { RelationshipStateRecord } from "../types";

export function createUnlockEventService() {
  return {
    evaluate(previous: RelationshipStateRecord, next: RelationshipStateRecord) {
      const events: Array<{ eventKey: string; eventSummary: string }> = [];

      if (previous.stage !== next.stage) {
        events.push({
          eventKey: `stage-${next.stage}`,
          eventSummary: `她开始用更${next.stage === "familiar" ? "熟悉" : "贴近"}的方式靠近你了。`,
        });
      }

      if (previous.initiativeScore < 40 && next.initiativeScore >= 40) {
        events.push({
          eventKey: "initiative-mid",
          eventSummary: "她开始更自然地主动靠近你了。",
        });
      }

      return events;
    },
  };
}