import { useState, useEffect, useMemo } from "react";
import type { Journal, Mood } from "../types/journal";
import { buildJournalMedia, buildJournalImagePrompt, persistAudiosIfNeeded, persistImagesIfNeeded } from "../services/minimax";
import { loadReferenceImage, replaceJournalOnBackend } from "../services/memory";
import { MoodTag } from "../components/MoodTag";
import { createGenerationTask } from "../services/generation/apiTaskClient";
import { pollGenerationTask } from "../services/generation/taskPolling";
import { generateDailyJournal, fetchOotdByDate, regenerateOotd, type OotdItem } from "../services/api/companionClient";
import { greetingStore, type GreetingCard as GreetingCardType } from "../services/greetingStore";
import { getCurrentUserId } from "../services/memory";
import type { DiaryWallRenderableItem } from "../types/diaryWall";
import { WallItemRenderer } from "../components/diaryWall/WallItemRenderer";

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
  // OOTD state — auto-loaded on mount so it appears as a wall item automatically
  const [ootd, setOotd] = useState<OotdItem | null>(null);
  const [ootdLoading, setOotdLoading] = useState(false);
  const [ootdError, setOotdError] = useState<string | null>(null);
  // Greeting reveal state — when an unread greeting is pending, allow it to be revealed inline
  const [pendingGreeting, setPendingGreeting] = useState<GreetingCardType | null>(null);

  const isLoading = phase === "generating";

const items = useMemo<DiaryWallRenderableItem[]>(() => [
  { kind: "journal", date: today, journal: displayedJournal },
  { kind: "ootd", date: today, ootd, loading: ootdLoading, error: ootdError ?? undefined },
  { kind: "greeting", date: today, greeting: null, pending: !!pendingGreeting },
], [today, displayedJournal, ootd, ootdLoading, ootdError, pendingGreeting]);

  // Load latest unread greeting on mount — she left you a message
  useEffect(() => {
    const latest = greetingStore.getLatestGreeting();
    if (latest && !latest.isRead) {
      setPendingGreeting(latest);
    }
  }, []);

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

  function handleGreetingRevealComplete() {
    if (!pendingGreeting) return;
    greetingStore.markAsRead(pendingGreeting.id);
    setPendingGreeting(null);
  }

  async function handleRefresh() {
    if (isLoading) return;
    setPhase("generating");
    setErrorMessage(null);

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
      await replaceJournalOnBackend(journal);
      onJournalRefresh(journal);
      setPhase("done");
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

      {items.map((item) => (
        <WallItemRenderer
          key={item.kind}
          item={item}
          onJournalRefresh={handleRefresh}
          onOotdRefresh={handleOotdRefresh}
          onGreetingRevealComplete={handleGreetingRevealComplete}
          isLoading={isLoading}
        />
      ))}

      <div className="action-row">
        <button type="button" className="ghost-button" onClick={onCancel}>返回首页</button>
      </div>
    </section>
  );
}