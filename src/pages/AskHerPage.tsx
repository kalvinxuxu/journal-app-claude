import { useState } from "react";
import type { Journal, Mood } from "../types/journal";
import { generateJournalDraft } from "../services/journalGeneration";
import { buildJournalMedia, buildJournalImagePrompt, persistAudiosIfNeeded, persistImagesIfNeeded } from "../services/minimax";
import { loadReferenceImage } from "../services/memory";
import { MoodTag } from "../components/MoodTag";
import { CompanionHintLine } from "../components/companion/CompanionHintLine";
import { CompanionFeedbackBar } from "../components/companion/CompanionFeedbackBar";
import { createGenerationTask } from "../services/generation/apiTaskClient";
import { pollGenerationTask } from "../services/generation/taskPolling";
import { submitCompanionFeedback, fetchCompanionContext } from "../services/api/companionClient";

type AskHerPageProps = {
  onSave: (journal: Journal) => void | Promise<void>;
  onCancel: () => void;
  voiceStyle?: "soft" | "warm" | "playful";
};

const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];

export type AskHerPhase =
  | "idle"
  | "draft-generating"
  | "image-generating"
  | "voice-generating"
  | "preview-ready"
  | "partial-error"
  | "fatal-error";

export function AskHerPage({ onSave, onCancel, voiceStyle }: AskHerPageProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mood, setMood] = useState<Mood>("开心");
  const [sceneHint, setSceneHint] = useState("");
  const [phase, setPhase] = useState<AskHerPhase>("idle");
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [generationErrors, setGenerationErrors] = useState<{ image?: string; voice?: string } | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Awaited<ReturnType<typeof generateJournalDraft>> | null>(null);
  const [previewJournal, setPreviewJournal] = useState<Journal | null>(null);

  const phaseButtonLabel: Record<AskHerPhase, string> = {
    "idle": "请她写",
    "draft-generating": "正在生成日记",
    "image-generating": "正在根据日记生成配图",
    "voice-generating": "正在生成语音",
    "preview-ready": "保存日记",
    "partial-error": "保存日记",
    "fatal-error": "请她写",
  };

  const isLoading = phase === "draft-generating" || phase === "image-generating" || phase === "voice-generating";

  async function handleGenerate() {
    if (isLoading) return;
    setPhase("draft-generating");
    setFatalError(null);
    setGenerationErrors(null);
    setPreviewJournal(null);

    try {
      // Fetch companion context if available (userId "local-user" for now)
      let companionContext: { relationshipStage: string; recalledMemory: string } | undefined;
      try {
        const context = await fetchCompanionContext("local-user");
        if (context.recalledMemory) {
          companionContext = {
            relationshipStage: context.relationshipStage,
            recalledMemory: context.recalledMemory,
          };
        }
      } catch {
        // Companion context not available - proceed without it
      }

      const draft = await generateJournalDraft({
        mood,
        date,
        sceneHint: sceneHint || undefined,
        memoryEngine: { recall: () => [], seed: () => {}, addMemory: () => {}, memories: [] } as ReturnType<typeof import("../services/generator").getMemoryEngine>,
        voiceStyle,
        companionContext,
      });
      setPreviewDraft(draft);

      const selectedDate = new Date(`${date}T12:00:00`);
      const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][selectedDate.getDay()];

      const draftJournal: Journal = {
        id: `journal-${date}-${Date.now()}`,
        date,
        weekday,
        mood,
        source: "girlfriend",
        content: draft.content,
        voiceMessages: draft.voiceMessages,
        voiceStyle,
      };

      setPhase("image-generating");

      let journal = draftJournal;
      let errors: { image?: string; voice?: string } = {};

      // Try task-based media generation first
      try {
        const imagePrompt = buildJournalImagePrompt(journal, { referenceImage: loadReferenceImage() ?? undefined, sceneHint: sceneHint || undefined });
        const voiceScripts = journal.voiceMessages.map(vm => ({ timing: vm.timing, transcript: vm.transcript }));

        const created = await createGenerationTask({
          type: "media_generation",
          input: {
            prompt: imagePrompt,
            mood,
            voiceStyle,
            voiceScripts,
            aspectRatio: "1:1",
            n: 1,
          },
          priority: 5,
        });

        const finalTask = await pollGenerationTask(created.task.id);

        if (finalTask.status === "succeeded" && finalTask.output) {
          const mediaOutput = finalTask.output as {
            images?: string[];
            voiceMessages?: typeof journal.voiceMessages;
            errors?: { image?: string; voice?: string; tts?: string };
          };
          const hasImages = Array.isArray(mediaOutput.images) && mediaOutput.images.length > 0;
          const hasVoiceMessages = Array.isArray(mediaOutput.voiceMessages) && mediaOutput.voiceMessages.length > 0;

          if (hasImages && hasVoiceMessages) {
            const persistedImages = await persistImagesIfNeeded(mediaOutput.images!);
            setPhase("voice-generating");
            const persistedVoiceMessages = await persistAudiosIfNeeded(mediaOutput.voiceMessages!);

            journal = {
              ...journal,
              images: persistedImages,
              voiceMessages: persistedVoiceMessages,
            };

            if (finalTask.error) {
              const errorMsgText = finalTask.error.message || "";
              const imgErrorMatch = errorMsgText.match(/图片生成失败：([^;]+)/);
              const voiceErrorMatch = errorMsgText.match(/语音生成失败：([^;]+)/);
              errors = {
                image: imgErrorMatch ? `图片生成失败：${imgErrorMatch[1].trim()}` : mediaOutput.errors?.image,
                voice: voiceErrorMatch ? `语音生成失败：${voiceErrorMatch[1].trim()}` : (mediaOutput.errors?.voice ?? mediaOutput.errors?.tts),
              };
            }

            setPreviewJournal(journal);
            setGenerationErrors(errors);
            setPhase(errors.image || errors.voice ? "partial-error" : "preview-ready");
            return;
          }
        }

        if (finalTask.error) {
          console.warn("Media generation task failed, falling back to direct API:", finalTask.error.message);
        }
      } catch (error) {
        console.warn("Media generation task system unavailable, falling back to direct API:", error);
      }

      // Fallback: direct buildJournalMedia
      setPhase("image-generating");
      const result = await buildJournalMedia(journal, {
        referenceImage: loadReferenceImage() ?? undefined,
        generateSelfies: false,
        sceneHint: sceneHint || undefined,
      });

      setPhase("voice-generating");
      journal = result.journal;
      errors = result.errors;
      setPreviewJournal(journal);
      setGenerationErrors(errors);
      setPhase(errors.image || errors.voice ? "partial-error" : "preview-ready");
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : String(err));
      setPhase("fatal-error");
    }
  }

  async function handleSave() {
    if (!previewJournal || isLoading) return;
    await onSave(previewJournal);
  }

  const isSavePhase = phase === "preview-ready" || phase === "partial-error";
  const handlePrimaryAction = isSavePhase ? handleSave : handleGenerate;

  return (
    <section className="page-stack">
      <div className="page-hero card">
        <div>
          <p className="section-label">请她写</p>
          <h2>让她来记录这一天</h2>
          <p className="hero-copy">选一个心情，她来生成配图、语音和内容。</p>
        </div>
        <button type="button" className="ghost-button" onClick={onCancel}>返回首页</button>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isLoading} />
        </label>

        <div className="field">
          <span>心情</span>
          <div className="mood-picker">
            {moods.map((m) => (
              <button
                key={m}
                type="button"
                className={m === mood ? "mood-picker__item is-active" : "mood-picker__item"}
                onClick={() => setMood(m)}
                disabled={isLoading}
              >
                <MoodTag mood={m} />
              </button>
            ))}
          </div>
        </div>

        <label className="field field--full">
          <span>场景提示（可选）</span>
          <input
            type="text"
            value={sceneHint}
            onChange={(e) => setSceneHint(e.target.value)}
            placeholder="比如：今天下雨了，想念我们一起撑伞的时候"
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading && (
        <div className="generation-status card is-info" role="status">
          <p className="section-label">生成进度</p>
          {phase === "draft-generating" && <p>正在生成日记</p>}
          {phase === "image-generating" && <p>正在根据日记生成配图</p>}
          {phase === "voice-generating" && <p>正在生成语音</p>}
        </div>
      )}

      {previewJournal ? (
        <div className="detail-card card">
          <div className="detail-card__top">
            <div>
              <p className="section-label">预览</p>
              <h3>她写的日记</h3>
            </div>
          </div>
          <p>{previewJournal.content}</p>

          {previewJournal.images && previewJournal.images.length > 0 && (
            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {previewJournal.images.map((img, i) => (
                <img key={i} src={img} alt={`Generated ${i + 1}`} style={{ width: "100%", borderRadius: "8px" }} />
              ))}
            </div>
          )}

          {previewJournal.voiceMessages.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              {previewJournal.voiceMessages.map((vm) => (
                <div key={vm.id} style={{ fontSize: "13px", color: "#424242" }}>
                  <span style={{ fontWeight: 500 }}>{vm.timing}</span>: {vm.transcript}
                </div>
              ))}
            </div>
          )}

          <CompanionHintLine text="你刚刚提到的那段心事，会让她更懂你一点。" />
          <CompanionFeedbackBar
            onSelect={(value) =>
              submitCompanionFeedback({
                userId: "local-user",
                journalId: previewJournal?.id,
                feedbackKind:
                  value === "tone_like"
                    ? "tone_preference"
                    : value === "less_initiative"
                      ? "initiative_preference"
                      : "recall_preference",
                feedbackValue: value,
              })
            }
          />
        </div>
      ) : null}

      {generationErrors && (phase === "preview-ready" || phase === "partial-error") ? (
        <div className="generation-status card is-warning" role="status">
          <p className="section-label">生成结果</p>
          {generationErrors.image ? <p style={{color: "#E65100"}}>图片：生成失败</p> : <p style={{color: "#2E7D32"}}>图片：生成成功</p>}
          {generationErrors.voice ? <p style={{color: "#E65100"}}>语音：生成失败</p> : <p style={{color: "#2E7D32"}}>语音：生成成功</p>}
        </div>
      ) : null}

      {fatalError ? (
        <div className="generation-status card is-error" role="alert">
          <p className="section-label">生成失败</p>
          <p>{fatalError}</p>
        </div>
      ) : null}

      <div className="action-row">
        <button type="button" className="ghost-button" onClick={onCancel}>取消</button>
        <button type="button" className="primary-button" onClick={handlePrimaryAction} disabled={isLoading}>
          {phaseButtonLabel[phase]}
        </button>
      </div>
    </section>
  );
}
