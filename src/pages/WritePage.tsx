import { useEffect, useState } from "react";
import { getMemoryEngine } from "../services/generator";
import { generateJournalDraft } from "../services/journalGeneration";
import { buildJournalMedia, persistAudiosIfNeeded, persistImagesIfNeeded } from "../services/minimax";
import { generateGirlfriendSelfies, persistImageIfNeeded } from "../services/minimax";
import { buildJournalImagePrompt } from "../services/minimax";
import { loadReferenceImage } from "../services/memory";
import type { Journal, Mood } from "../types/journal";
import type { JournalMediaErrors } from "../services/minimax";
import { MoodTag } from "../components/MoodTag";
import { SelfiePreviewModal } from "../components/SelfiePreviewModal";
import { CompanionHintLine } from "../components/companion/CompanionHintLine";
import { createGenerationTask } from "../services/generation/apiTaskClient";
import { pollGenerationTask } from "../services/generation/taskPolling";
import { taskStore } from "../services/generation/taskStore";

type WritePageProps = {
  onSave: (journal: Journal) => void | Promise<void>;
  onSelfieSave?: (journalId: string, selfieUrl: string) => void;
  onCancel: () => void;
  voiceStyle?: "soft" | "warm" | "playful";
};

const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];

export function WritePage({ onSave, onCancel, voiceStyle }: WritePageProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mood, setMood] = useState<Mood>("开心");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [generationErrors, setGenerationErrors] = useState<JournalMediaErrors | null>(null);
  const [content, setContent] = useState("正在生成日记内容...");
  const [voiceMessages, setVoiceMessages] = useState(initialVoiceMessages());
  const [draftReady, setDraftReady] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState<{ url: string; journalId: string } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Initial draft loading
  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split("T")[0];
    generateJournalDraft({
      mood: "开心",
      date: today,
      memoryEngine: getMemoryEngine(),
      voiceStyle,
    }).then((draft) => {
      if (!cancelled) {
        setContent(draft.content);
        setVoiceMessages(draft.voiceMessages);
        setDraftReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [voiceStyle]);

  function initialVoiceMessages() {
    return (["morning", "afternoon", "night"] as const).map((timing, i) => ({
      id: `voice-${timing}`,
      timing,
      transcript: "",
      duration: i === 0 ? "0:12" : i === 1 ? "0:15" : "0:18",
    }));
  }

  function resetGenerationFeedback() {
    setSaveState((current) => (current === "error" ? "idle" : current));
    setGenerationErrors(null);
  }

  function createMediaTaskInput() {
    const selectedDate = new Date(`${date}T12:00:00`);
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][selectedDate.getDay()];
    const journal = {
      id: `journal-${date}`,
      date,
      weekday,
      mood,
      content,
      voiceMessages,
    };
    const referenceImage = loadReferenceImage() ?? undefined;

    return {
      journal,
      prompt: buildJournalImagePrompt(journal),
      mood,
      voiceScripts: voiceMessages.map(({ timing, transcript }) => ({ timing, transcript })),
      aspectRatio: "1:1",
      n: 1,
      referenceImage,
      generateSelfies: false,
      voiceStyle,
    };
  }

  function handleMoodChange(nextMood: Mood) {
    setMood(nextMood);
    resetGenerationFeedback();
    regenerateDraft(nextMood, date);
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    resetGenerationFeedback();
    regenerateDraft(mood, nextDate);
  }

  async function regenerateDraft(nextMood: Mood, nextDate: string) {
    setSaveState("idle");
    const draft = await generateJournalDraft({
      mood: nextMood,
      date: nextDate,
      memoryEngine: getMemoryEngine(),
      voiceStyle,
    });
    setContent(draft.content);
    setVoiceMessages(draft.voiceMessages);
    setDraftReady(true);
  }

  async function handleSave() {
    if (saveState === "saving") return;

    setSaveState("saving");
    setGenerationErrors(null);

    const taskInput = createMediaTaskInput();

    try {
      // Create task via backend API
      const created = await createGenerationTask({
        type: "media_generation",
        input: taskInput,
        priority: 5,
      });

      setActiveTaskId(created.task.id);
      taskStore.upsertTask(created.task as unknown as Parameters<typeof taskStore.upsertTask>[0]);

      // Poll for task completion
      const finalTask = await pollGenerationTask(created.task.id);
      setActiveTaskId(null);

      // Handle completed task
      if (finalTask.status === "succeeded" && finalTask.output) {
        const mediaOutput = finalTask.output as {
          images?: string[];
          voiceMessages?: typeof voiceMessages;
          errors?: { image?: string; voice?: string; tts?: string };
        };
        const hasImages = Array.isArray(mediaOutput.images) && mediaOutput.images.length > 0;
        const hasVoiceMessages = Array.isArray(mediaOutput.voiceMessages) && mediaOutput.voiceMessages.length > 0;

        if (!hasImages || !hasVoiceMessages) {
          console.warn("Media generation task returned incomplete output, falling back to sync mode");
          await handleSaveSync();
          return;
        }

        // P2-1/P2-2: Persist task output data URLs to stable backend URLs before saving
        const [persistedImages, persistedVoiceMessages] = await Promise.all([
          mediaOutput.images ? persistImagesIfNeeded(mediaOutput.images) : Promise.resolve(undefined),
          mediaOutput.voiceMessages ? persistAudiosIfNeeded(mediaOutput.voiceMessages) : Promise.resolve(undefined),
        ]);
        const enrichedJournal = {
          ...taskInput.journal,
          images: persistedImages ?? mediaOutput.images,
          voiceMessages: persistedVoiceMessages ?? mediaOutput.voiceMessages,
        };

        if (finalTask.error) {
          const errorMsg = finalTask.error.message || "";
          const imgErrorMatch = errorMsg.match(/图片生成失败：([^;]+)/);
          const voiceErrorMatch = errorMsg.match(/语音生成失败：([^;]+)/);
          const fallbackErrors: JournalMediaErrors = {
            image: imgErrorMatch ? `图片生成失败：${imgErrorMatch[1].trim()}` : (mediaOutput.errors?.image ?? (errorMsg.includes("图片") ? `图片生成失败：${errorMsg}` : undefined)),
            voice: voiceErrorMatch ? `语音生成失败：${voiceErrorMatch[1].trim()}` : (mediaOutput.errors?.voice ?? mediaOutput.errors?.tts ?? (errorMsg.includes("语音") ? `语音生成失败：${errorMsg}` : undefined)),
          };
          setGenerationErrors(fallbackErrors);
          setSaveState("error");
        }
        await Promise.resolve(onSave(enrichedJournal));
        if (!finalTask.error) {
          setSaveState("idle");
        }
      } else if (finalTask.status === "failed" || finalTask.status === "stale") {
        const errorMsg = finalTask.error?.message ?? "生成失败";
        const fallbackErrors: JournalMediaErrors = {
          image: errorMsg,
          voice: errorMsg,
        };
        setGenerationErrors(fallbackErrors);
        setSaveState("error");
        await Promise.resolve(onSave(taskInput.journal));
      }
    } catch (error) {
      console.error("Task execution failed, falling back to sync mode", error);
      await handleSaveSync();
    }
  }

  async function handleSaveSync() {
    const selectedDate = new Date(`${date}T12:00:00`);
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][selectedDate.getDay()];

    const draft = {
      id: `journal-${date}`,
      date,
      weekday,
      mood,
      source: "user" as const,
      content,
      voiceMessages,
      voiceStyle,
    };

    try {
      const referenceImage = loadReferenceImage() ?? undefined;
      const result = await buildJournalMedia(draft, {
        referenceImage,
        generateSelfies: false,
      });

      await Promise.resolve(onSave(result.journal));
      setGenerationErrors(result.errors);
      setSaveState(result.errors.image || result.errors.voice ? "error" : "idle");
    } catch (error) {
      console.error("Failed to build journal media", error);
      const fallbackErrors: JournalMediaErrors = {
        image: `图片生成失败：${error instanceof Error ? error.message : String(error)}`,
        voice: `语音生成失败：${error instanceof Error ? error.message : String(error)}`,
      };
      setGenerationErrors(fallbackErrors);
      setSaveState("error");
      await Promise.resolve(onSave(draft));
    }
  }

  function handleSelfieSave(url: string) {
    setSelfiePreview(null);
  }

  function handleSelfieRegenerate() {
    if (!selfiePreview) return;
    generateGirlfriendSelfies(mood, loadReferenceImage() ?? undefined, content, date).then(result => {
      if (result.morningSelfie) {
        setSelfiePreview({ url: result.morningSelfie, journalId: selfiePreview.journalId });
      }
    });
  }

  const showStatus = saveState === "saving" || Boolean(generationErrors?.image || generationErrors?.voice);
  const showErrorStatus = Boolean(generationErrors?.image || generationErrors?.voice);
  const saveButtonLabel = saveState === "saving" ? "生成中..." : saveState === "error" ? "失败重试" : "写好并请她补全";

  return (
    <section className="page-stack">
      <div className="page-hero card">
        <div>
          <p className="section-label">我来写</p>
          <h2>把今天记下来</h2>
          <p className="hero-copy">你写正文，她来补全配图、语音和自拍。</p>
        </div>

        <button type="button" className="ghost-button" onClick={onCancel}>
          返回首页
        </button>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>日期</span>
          <input type="date" value={date} onChange={(event) => handleDateChange(event.target.value)} />
        </label>

        <div className="field">
          <span>心情</span>
          <div className="mood-picker">
            {moods.map((item) => (
              <button
                key={item}
                type="button"
                className={item === mood ? "mood-picker__item is-active" : "mood-picker__item"}
                onClick={() => handleMoodChange(item)}
              >
                <MoodTag mood={item} />
              </button>
            ))}
          </div>
        </div>

        <label className="field field--full">
          <span>日记内容</span>
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              resetGenerationFeedback();
            }}
            rows={10}
            disabled={!draftReady}
          />
        </label>

        <CompanionHintLine text="你写下来的某些细节，会在以后被她慢慢记住。" />

        <div className="field field--full">
          <span>语音留言预览</span>
          <div className="voice-preview-grid">
            {voiceMessages.map((voice) => (
              <article key={voice.id} className="voice-preview-card">
                <strong>{voice.timing === "morning" ? "早安" : voice.timing === "afternoon" ? "午后" : "晚安"}</strong>
                <p>{voice.transcript}</p>
                <small>{voice.duration}</small>
              </article>
            ))}
          </div>
        </div>
      </div>

      {showStatus ? (
        <div className={showErrorStatus ? "generation-status card is-error" : "generation-status card"} aria-live="polite">
          <p className="section-label">生成结果</p>
          {saveState === "saving" ? <p>正在生成图片和语音，请稍等一下。</p> : null}
          {showErrorStatus ? (
            <div className="generation-status__errors">
              {generationErrors?.image ? <p>{generationErrors.image}</p> : null}
              {generationErrors?.voice ? <p>{generationErrors.voice}</p> : null}
              <p>已回退到当前草稿内容。点击"失败重试"可以重新生成。</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="action-row">
        <button type="button" className="ghost-button" onClick={onCancel}>
          取消
        </button>
        <button type="button" className="primary-button" onClick={handleSave} disabled={saveState === "saving" || !draftReady}>
          {saveButtonLabel}
        </button>
      </div>

      {selfiePreview && (
        <SelfiePreviewModal
          selfieUrl={selfiePreview.url}
          mood={mood}
          onSave={handleSelfieSave}
          onRegenerate={handleSelfieRegenerate}
          onSkip={() => setSelfiePreview(null)}
        />
      )}
    </section>
  );
}
