export type AvatarPromptOption = {
  id: string;
  label: string;
  consequenceTag: string;
};

export type AvatarPromptRecord = {
  id: string;
  userId: string;
  promptType: "outfit_choice" | "food_choice" | "outing_choice" | "light_ping";
  promptText: string;
  options: AvatarPromptOption[];
  status: "scheduled" | "active" | "answered" | "returned";
  scheduledFor: string;
  respondedAt: string | null;
  selectedOptionId: string | null;
  acknowledgementText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AvatarResultRecord = {
  id: string;
  userId: string;
  promptId: string;
  resultKind: string;
  title: string;
  body: string;
  imageUrl: string | null;
  metadata: Record<string, unknown>;
  surfacedAt: string | null;
  createdAt: string;
  updatedAt: string;
};