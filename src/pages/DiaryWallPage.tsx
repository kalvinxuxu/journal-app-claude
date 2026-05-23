import { useState, useEffect } from "react";
import type { Journal, Mood } from "../types/journal";
import { buildJournalMedia, buildJournalImagePrompt, persistAudiosIfNeeded, persistImagesIfNeeded } from "../services/minimax";
import { loadReferenceImage, replaceJournalOnBackend } from "../services/memory";
import { MoodTag } from "../components/MoodTag";
import { CompanionHintLine } from "../components/companion/CompanionHintLine";
import { CompanionFeedbackBar } from "../components/companion/CompanionFeedbackBar";
import { createGenerationTask } from "../services/generation/apiTaskClient";
import { pollGenerationTask } from "../services/generation/taskPolling";
import { submitCompanionFeedback, generateDailyJournal, fetchOotdByDate, regenerateOotd, type OotdItem } from "../services/api/companionClient";
import { GreetingCard } from "../components/companion/GreetingCard";
import { greetingStore } from "../services/greetingStore";
import { getCurrentUserId } from "../services/memory";

type DiaryWallPageProps = {
  /** The journal already generated for today (if any) — shown as the wall's anchor item */
  todayJournal?: Journal | null;
  onJournalRefresh: (journal: Journal) => void;
  onCancel: () => void;
  voiceStyle?: "soft" | "warm" | "playful";
};

const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];

export type DiaryWallPhase =
  | "idle"
  | "generating"
  | "done"
  | "error";

/**
 * DiaryWallPage — a feed of companion-authored daily artifacts.
 *
 * Renders:
 *   - Today's journal entry (with refresh capability via "重新记录今天")
 *   - OOTD card (lazy-loaded)
 *   - Pending greeting card (if any)
 *
 * The "重新记录今天" button regenerates the journal in place. It no longer
 * goes through a multi-phase wizard (draft → image → voice → preview → save).
 * Instead, the wall updates atomically when regeneration completes.
 */
export function DiaryWallPage({ todayJournal, onJournalRefresh, onCancel, voiceStyle }: DiaryWallPageProps) {
  const today = new Date().toISOString().split("T")[0];
  const [mood, setMood] = useState<Mood>(todayJournal?.mood ?? "开心");
  const [sceneHint, setSceneHint] = useState("");
  const [phase, setPhase] = useState<DiaryWallPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The journal being displayed / being refreshed
  const [displayedJournal, setDisplayedJournal] = useState<Journal | null>(todayJournal ?? null);
  // Generation errors (partialsuccess)
  const [genErrors, setGenErrors] = useState<{ image?: string; voice?: string } | null>(null);
  // OOTD state — auto-loaded on mount so it appears as a wall item automatically
  const [ootd, setOotd] = useState<OotdItem | null>(null);
  const [ootdLoading, setOotdLoading] = useState(false);
  const [ootdError, setOotdError] = useState<string | null>(null);

  const isLoading = phase === "generating";

  // Auto-fetch OOTD on mount (she already picked something today)
  useEffect(() => {
    let cancelled = false;
    setOotdLoading(true);
    setOotdError(null);
    fetchOotdByDate(getCurrentUserId(), today)
      .then((result) => {
        if (!cancelled) {
          setOotd(result);
          setOotdLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOotdError("加载失败");
          setOotdLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function handleOotdRefresh() {
    setOotdLoading(true);
    setOotdError(null);
    try {
      const result = await regenerateOotd(getCurrentUserId(), today);
      setOotd(result);
    } catch {
      setOotdError("刷新失败");
    } finally {
      setOotdLoading(false);
    }
  }

  async function handleRefresh() {
    if (isLoading) return;
    setPhase("generating");
    setErrorMessage(null);
    setGenErrors(null);

    try {
      const userId = getCurrentUserId();
      const result = await generateDailyJournal({
        userId,
        date: today,
        mood,
        voiceStyle,
        sceneHint: sceneHint || undefined,
      });

      const remoteJournal = result.journal;
      const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
        new Date(`${today}T12:00:00`).getDay()
      ];

      let journal: Journal = {
        id: remoteJournal.id,
        date: remoteJournal.date,
        weekday,
        mood: remoteJournal.mood as Mood,
        source: "girlfriend",
        content: remoteJournal.content,
        voiceMessages: remoteJournal.voiceMessages.map((vm) => ({
          id: vm.id,
          timing: vm.timing as "morning" | "afternoon" | "night",
          transcript: vm.transcript,
          duration: vm.duration,
        })),
        voiceStyle: remoteJournal.voiceStyle as "soft" | "warm" | "playful" | undefined,
      };

      let errors: { image?: string; voice?: string } = {};

      // Generate media (images + voice) via task system
      try {
        const imagePrompt = buildJournalImagePrompt(journal, {
          referenceImage: loadReferenceImage() ?? undefined,
          sceneHint: sceneHint || undefined,
        });
        const voiceScripts = journal.voiceMessages.map((vm) => ({
          timing: vm.timing,
          transcript: vm.transcript,
        }));

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
          }
        }

        if (finalTask.error) {
          console.warn("Media generation task failed, falling back to direct API:", finalTask.error.message);
        }
      } catch (error) {
        console.warn("Media generation task system unavailable, falling back to direct API:", error);
      }

      // Fallback: direct buildJournalMedia for any missing media
      if (!journal.images || journal.images.length === 0) {
        const result = await buildJournalMedia(journal, {
          referenceImage: loadReferenceImage() ?? undefined,
          generateSelfies: false,
          sceneHint: sceneHint || undefined,
        });
        journal = result.journal;
        errors = result.errors;
      }

      setDisplayedJournal(journal);
      setGenErrors(errors);
      await replaceJournalOnBackend(journal);
      onJournalRefresh(journal);
      setPhase(errors.image || errors.voice ? "error" : "done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  return (
    <section className="page-stack">
      {/* Hero — positioned as entering the diary wall */}
      <div className="page-hero card">
        <div>
          <p className="section-label">日记墙</p>
          <h2>她在为你记录每一天</h2>
          <p className="hero-copy">这是她为你准备的日记、穿搭和问候。</p>
        </div>
        <button type="button" className="ghost-button" onClick={onCancel}>返回首页</button>
      </div>

      {/* ===== Today's Journal — the anchor wall item ===== */}
      {displayedJournal ? (
        <div className="detail-card card">
          <div className="detail-card__top">
            <div>
              <p className="section-label">今日日记</p>
              <h3>她记录了这一天</h3>
            </div>
            <button
              type="button"
              className="toggle-button"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? "记录中..." : "重新记录今天"}
            </button>
          </div>

          {isLoading && phase === "generating" ? (
            <p style={{ color: "#757575", fontSize: "13px" }}>正在重新生成日记...</p>
          ) : (
            <>
              <p>{displayedJournal.content}</p>

              {displayedJournal.images && displayedJournal.images.length > 0 && (
                <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {displayedJournal.images.map((img, i) => (
                    <img key={i} src={img} alt={`Generated ${i + 1}`} style={{ width: "100%", borderRadius: "8px" }} />
                  ))}
                </div>
              )}

              {displayedJournal.voiceMessages.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  {displayedJournal.voiceMessages.map((vm) => (
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
                    userId: getCurrentUserId(),
                    journalId: displayedJournal?.id,
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
            </>
          )}
        </div>
      ) : (
        <div className="detail-card card">
          <div className="detail-card__top">
            <div>
              <p className="section-label">今日日记</p>
              <h3>她还没有记录今天</h3>
            </div>
          </div>
          <p style={{ color: "#757575" }}>点击按钮，让她为你记录今天。</p>
          <button
            type="button"
            className="primary-button"
            onClick={handleRefresh}
            disabled={isLoading}
            style={{ marginTop: "12px" }}
          >
            {isLoading ? "记录中..." : "让她记录今天"}
          </button>
        </div>
      )}

      {/* Generation errors shown inline */}
      {genErrors && phase === "error" ? (
        <div className="generation-status card is-warning" role="status">
          <p className="section-label">生成结果</p>
          {genErrors.image ? (
            <p style={{ color: "#E65100" }}>图片：生成失败</p>
          ) : (
            <p style={{ color: "#2E7D32" }}>图片：生成成功</p>
          )}
          {genErrors.voice ? (
            <p style={{ color: "#E65100" }}>语音：生成失败</p>
          ) : (
            <p style={{ color: "#2E7D32" }}>语音：生成成功</p>
          )}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="generation-status card is-error" role="alert">
          <p className="section-label">生成失败</p>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {/* ===== Mood + Scene Hint — controls for regeneration ===== */}
      <div className="form-grid">
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

      {/* ===== OOTD — auto-surfaced as a wall item (she picked this today) ===== */}
      {ootdLoading ? (
        <div className="detail-card card">
          <p className="section-label">今日穿搭</p>
          <p style={{ color: "#757575", fontSize: "13px" }}>loading...</p>
        </div>
      ) : ootd ? (
        <div className="detail-card card">
          <div className="detail-card__top">
            <div>
              <p className="section-label">今日穿搭</p>
              <h3>她今天想穿这套</h3>
            </div>
            <button
              type="button"
              className="toggle-button"
              onClick={handleOotdRefresh}
              disabled={ootdLoading}
            >
              换一套
            </button>
          </div>
          {ootd.imageUrl ? (
            <div style={{ marginTop: "12px" }}>
              <img
                src={ootd.imageUrl}
                alt="今日穿搭"
                style={{ width: "100%", maxWidth: "240px", borderRadius: "8px" }}
              />
            </div>
          ) : (
            <div style={{ width: "100%", height: "160px", background: "#F3E5F5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "12px" }}>
              <span style={{ color: "#6A1B9A", fontSize: "13px" }}>这是她今天想穿的</span>
            </div>
          )}
          {ootd.caption && (
            <p style={{ fontSize: "12px", color: "#757575", marginTop: "8px" }}>{ootd.caption}</p>
          )}
        </div>
      ) : ootdError ? (
        <div className="detail-card card">
          <p className="section-label">今日穿搭</p>
          <p style={{ color: "#C62828", fontSize: "13px" }}>{ootdError}</p>
          <button type="button" className="toggle-button" onClick={handleOotdRefresh}>
            重试
          </button>
        </div>
      ) : null}

      {/* ===== Greeting Card — pending companion greeting ===== */}
      <GreetingCard onOpen={() => {}} />

      <div className="action-row">
        <button type="button" className="ghost-button" onClick={onCancel}>返回首页</button>
      </div>
    </section>
  );
}