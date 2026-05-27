import { useState, useEffect } from "react";
import { fetchActiveAvatarPrompt, submitAvatarPromptChoice } from "../../services/api/companionClient";
import type { HomeAvatarPromptRecord } from "../../types/avatarChoiceLoop";

export function HomeAvatarPrompt({
  userId,
  onResolved,
}: {
  userId: string;
  onResolved: (payload: { promptId: string; selectedOptionId: string; acknowledgement: string }) => void;
}) {
  const [prompt, setPrompt] = useState<HomeAvatarPromptRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveAvatarPrompt(userId)
      .then(({ prompt }) => {
        if (prompt) setPrompt(prompt);
      })
      .catch(() => {});
  }, [userId]);

  async function handleSubmit() {
    if (!prompt || !selectedOptionId) return;
    try {
      const result = await submitAvatarPromptChoice({
        userId,
        promptId: prompt.id,
        selectedOptionId,
      });
      setAcknowledgement(result.acknowledgement);
      onResolved({ promptId: prompt.id, selectedOptionId, acknowledgement: result.acknowledgement });
    } catch {
      // handle error silently
    }
  }

  if (!prompt) return null;

  return (
    <div className="home-avatar-prompt" aria-label="首页女友头像互动">
      <button
        type="button"
        className="home-avatar-prompt__avatar"
        aria-label="打开她的消息"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="home-avatar-prompt__dot" />
        <span className="home-avatar-prompt__face">她</span>
      </button>

      {!open ? (
        <div className="home-avatar-prompt__bubble">{prompt.promptText}</div>
      ) : null}

      {open ? (
        <div className="home-avatar-prompt__panel">
          <p>{prompt.promptText}</p>
          <div className="home-avatar-prompt__options">
            {prompt.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={selectedOptionId === option.id ? "is-selected" : ""}
                onClick={() => setSelectedOptionId(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleSubmit} disabled={!selectedOptionId}>
            发送选择
          </button>
          {acknowledgement ? <p className="home-avatar-prompt__ack">{acknowledgement}</p> : null}
        </div>
      ) : null}
    </div>
  );
}