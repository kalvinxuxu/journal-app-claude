import type { AvatarPromptRecord } from "../types/avatarChoiceLoop";
import { createAvatarPromptStore } from "../store/avatarPromptStore";
import type { RelationshipStateRecord } from "../types/relationshipState";

const MORNING_PROMPTS = [
  {
    promptType: "outfit_choice" as const,
    promptText: "今晚要见朋友，我穿哪件比较好呀？",
    options: [
      { id: "white_dress", label: "白裙子", consequenceTag: "soft_gentle" },
      { id: "black_knit", label: "黑色针织", consequenceTag: "calm_polished" },
      { id: "denim_jacket", label: "牛仔外套", consequenceTag: "casual_playful" },
    ],
  },
];

export function createAvatarPromptService(deps: {
  db: any;
  relationshipStateStore: {
    findByUserId(userId: string): RelationshipStateRecord | null;
    upsert(record: RelationshipStateRecord): void;
  };
}) {
  const promptStore = createAvatarPromptStore(deps.db);

  function ensureUserExists(userId: string) {
    const existing = deps.db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!existing) {
      const now = new Date().toISOString();
      deps.db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(userId, now, now);
    }
  }

  return {
    getOrCreateActivePrompt(userId: string, nowIso: string): AvatarPromptRecord {
      const existing = promptStore.findActivePrompt(userId, nowIso);
      if (existing) return existing;

      ensureUserExists(userId);
      const template = MORNING_PROMPTS[0];
      const createdAt = nowIso;
      const prompt: AvatarPromptRecord = {
        id: `avp_${Date.now()}`,
        userId,
        promptType: template.promptType,
        promptText: template.promptText,
        options: template.options,
        status: "active",
        scheduledFor: nowIso,
        respondedAt: null,
        selectedOptionId: null,
        acknowledgementText: null,
        createdAt,
        updatedAt: createdAt,
      };
      promptStore.insertPrompt(prompt);
      return prompt;
    },

    answerPrompt(userId: string, promptId: string, selectedOptionId: string, nowIso: string) {
      const acknowledgementText = "好吧，那我听你的。";
      promptStore.markAnswered({
        userId,
        promptId,
        selectedOptionId,
        acknowledgementText,
        respondedAt: nowIso,
      });

      promptStore.insertResult({
        id: `avr_${Date.now()}`,
        userId,
        promptId,
        resultKind: "avatar_choice_result",
        title: "你帮她选的结果回来了",
        body: "她后来真的按你选的那一项出门了。",
        imageUrl: null,
        metadata: { selectedOptionId },
        surfacedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const relationship = deps.relationshipStateStore.findByUserId(userId);
      if (relationship) {
        deps.relationshipStateStore.upsert({
          ...relationship,
          intimacyScore: relationship.intimacyScore + 1,
          updatedAt: nowIso,
        });
      }

      return { acknowledgementText };
    },

    listResults(userId: string) {
      return promptStore.listUnsurfacedResults(userId);
    },
  };
}