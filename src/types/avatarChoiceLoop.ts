export type HomeAvatarPromptOption = {
  id: string;
  label: string;
  consequenceTag: string;
};

export type HomeAvatarPromptRecord = {
  id: string;
  promptType: "outfit_choice" | "food_choice" | "outing_choice" | "light_ping";
  promptText: string;
  options: HomeAvatarPromptOption[];
  status: "active" | "answered" | "returned";
  selectedOptionId: string | null;
  acknowledgementText: string | null;
};

export type HomeAvatarResultRecord = {
  id: string;
  promptId: string;
  resultKind: "avatar_choice_result";
  title: string;
  body: string;
  imageUrl: string | null;
  metadata: { selectedOptionId: string };
};