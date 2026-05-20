import { useState } from "react";
import type { Journal, Mood } from "../types/journal";
import { generateJournalDraft } from "../services/journalGeneration";
import { buildJournalMedia, buildJournalImagePrompt, persistAudiosIfNeeded, persistImagesIfNeeded } from "../services/minimax";
import { loadReferenceImage } from "../services/memory";
import { MoodTag } from "../components/MoodTag";
import { createGenerationTask } from "../services/generation/apiTaskClient";
import { pollGenerationTask } from "../services/generation/taskPolling";

type AskHerPageProps = {
  onSave: (journal: Journal) => void | Promise<void>;
  onCancel: () => void;
  voiceStyle?: "soft" | "warm" | "playful";
};

const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];

export function AskHerPage({ onSave, onCancel, voiceStyle }: AskHerPageProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mood, setMood] = useState<Mood>("开心");
  const [sceneHint, setSceneHint] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "generating" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationErrors, setGenerationErrors] = useState<{ image?: string; voice?: string } | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Awaited<ReturnType<typeof generateJournalDraft>> | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  async function handleGenerate() {
    if (saveState === "generating") return;
    setSaveState("generating");
    setErrorMsg(null);
    setPreviewContent(null);

    try {
      const draft = await generateJournalDraft({
        mood,
        date,
        sceneHint: sceneHint || undefined,
        memoryEngine: { recall: () => [], seed: () => {}, addMemory: () => {}, memories: [] } as ReturnType<typeof import("../services/generator").getMemoryEngine>,
        voiceStyle,
      });
      setPreviewDraft(draft);
      setPreviewContent(draft.content);
      setSaveState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setSaveState("error");
    }
  }

  async function handleSave() {
    if (!previewContent || saveState === "generating") return;
    setSaveState("generating");

    const selectedDate = new Date(`${date}T12:00:00`);
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][selectedDate.getDay()];

    const draft: Journal = {
      id: `journal-${date}`,
      date,
      weekday,
      mood,
      source: "girlfriend",
      content: previewContent,
      voiceMessages: previewDraft?.voiceMessages ?? [],
      voiceStyle,
    };

    // Try task-based media generation
    try {
      const imagePrompt = buildJournalImagePrompt(draft, { referenceImage: loadReferenceImage() ?? undefined, sceneHint: sceneHint || undefined });
      const voiceScripts = draft.voiceMessages.map(vm => ({ timing: vm.timing, transcript: vm.transcript }));

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
          voiceMessages?: typeof draft.voiceMessages;
          errors?: { image?: string; voice?: string; tts?: string };
        };
        const hasImages = Array.isArray(mediaOutput.images) && mediaOutput.images.length > 0;
        const hasVoiceMessages = Array.isArray(mediaOutput.voiceMessages) && mediaOutput.voiceMessages.length > 0;

        if (!hasImages || !hasVoiceMessages) {
          console.warn("Media generation task returned incomplete output, falling back to direct API.");
          throw new Error("incomplete media task output");
        }

        const enrichedJournal: Journal = {
          ...draft,
          images: mediaOutput.images,
          voiceMessages: mediaOutput.voiceMessages ?? draft.voiceMessages,
        };

        if (finalTask.error) {
          const errorMsgText = finalTask.error.message || "";
          const imgErrorMatch = errorMsgText.match(/图片生成失败：([^;]+)/);
          const voiceErrorMatch = errorMsgText.match(/语音生成失败：([^;]+)/);
          setGenerationErrors({
            image: imgErrorMatch ? `图片生成失败：${imgErrorMatch[1].trim()}` : mediaOutput.errors?.image,
            voice: voiceErrorMatch ? `语音生成失败：${voiceErrorMatch[1].trim()}` : (mediaOutput.errors?.voice ?? mediaOutput.errors?.tts),
          });
        }

        // P2-1/P2-2: Persist task output data URLs to stable backend URLs before saving
        const [persistedImages, persistedVoiceMessages] = await Promise.all([
          mediaOutput.images ? persistImagesIfNeeded(mediaOutput.images) : Promise.resolve(undefined),
          mediaOutput.voiceMessages ? persistAudiosIfNeeded(mediaOutput.voiceMessages) : Promise.resolve(undefined),
        ]);
        const persistedJournal: Journal = {
          ...draft,
          images: persistedImages ?? draft.images,
          voiceMessages: persistedVoiceMessages ?? draft.voiceMessages,
        };

        await onSave(persistedJournal);
        setSaveState(finalTask.error ? "error" : "idle");
        return;
      }

      // Task failed or returned unexpected state - fall back to direct API
      if (finalTask.error) {
        console.warn("Media generation task failed, falling back to direct API:", finalTask.error.message);
      }
    } catch (error) {
      console.warn("Media generation task system unavailable, falling back to direct API:", error);
    }

    // Fallback: direct buildJournalMedia (handles selfies and sceneHint correctly)
    try {
      const result = await buildJournalMedia(draft, {
        referenceImage: loadReferenceImage() ?? undefined,
        generateSelfies: false,
        sceneHint: sceneHint || undefined,
      });
      setGenerationErrors(result.errors);
      await onSave(result.journal);
      setSaveState(result.errors.image || result.errors.voice ? "error" : "idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setGenerationErrors({ image: err instanceof Error ? err.message : String(err) });
      setSaveState("error");
    }
  }

  const saveButtonLabel = saveState === "generating" ? "生成中..." : previewContent ? "保存日记" : "请她写";

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
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
          />
        </label>
      </div>

      {previewContent ? (
        <div className="detail-card card">
          <div className="detail-card__top">
            <div>
              <p className="section-label">预览</p>
              <h3>她写的日记</h3>
            </div>
          </div>
          <p>{previewContent}</p>
        </div>
      ) : null}

      {generationErrors ? (
        <div className="generation-status card is-warning" role="status">
          <p className="section-label">部分生成结果</p>
          {generationErrors.image ? <p>图片：生成失败</p> : <p style={{color: "#2E7D32"}}>图片：生成成功</p>}
          {generationErrors.voice ? <p>语音：生成失败</p> : <p style={{color: "#2E7D32"}}>语音：生成成功</p>}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="generation-status card is-error" role="alert">
          <p className="section-label">生成失败</p>
          <p>{errorMsg}</p>
        </div>
      ) : null}

      <div className="action-row">
        <button type="button" className="ghost-button" onClick={onCancel}>取消</button>
        {!previewContent ? (
          <button type="button" className="primary-button" onClick={handleGenerate} disabled={saveState === "generating"}>
            {saveButtonLabel}
          </button>
        ) : (
          <button type="button" className="primary-button" onClick={handleSave} disabled={saveState === "generating"}>
            保存日记
          </button>
        )}
      </div>
    </section>
  );
}
