import { useEffect, useState, useRef } from "react";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { WritePage } from "./pages/WritePage";
import { AskHerPage } from "./pages/AskHerPage";
import { PhotoWallPage } from "./pages/PhotoWallPage";
import { GreetingPage } from "./pages/GreetingPage";
import { CompanionOnboardingPage } from "./pages/CompanionOnboardingPage";
import { checkBackendHealth } from "./services/api/mediaClient";
import { checkCompanionOnboardingStatus } from "./services/api/companionClient";
import { loadCompanionReveal, saveCompanionReveal } from "./services/companion";
import { addJournalToMemory, getMemoryEngine } from "./services/generator";
import {
  loadJournalsWithSource,
  loadJournalsWithBackendFallback,
  journalExistsOnBackend,
  loadPreferences,
  loadSelectedJournalId,
  loadValidReferenceImage,
  saveJournals,
  saveJournalToBackend,
  saveLatestSelfie,
  savePreferences,
  saveSelectedJournalId,
  saveReferenceImageAsBase64,
  migrateLocalStorageJournalsToBackend,
  getCurrentUserId,
} from "./services/memory";
import { rebuildMemoryFromJournals } from "./services/memoryRebuild";
import { generateGirlfriendSelfies, generateNightBonusSelfie, synthesizeVoiceMessages } from "./services/minimax";
import { shouldTriggerMorningSelfie, shouldTriggerNightBonus } from "./services/selfieSharing";
import { generateJournalDraft } from "./services/journalGeneration";
import { isDailySummary, toJournalEntry } from "./services/journalAggregation";
import { taskStore } from './services/generation/taskStore';
import { greetingStore, type GreetingCard } from './services/greetingStore';
import type { AppPage, Journal, Preferences, Mood } from "./types/journal";

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getWeekday(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function stripDailySummaries(journals: Journal[]) {
  return journals.filter((journal) => !isDailySummary(journal));
}

function findLatestJournalByDate(journals: Journal[], date: string) {
  return journals.find((journal) => journal.date === date && !isDailySummary(journal));
}

export function App() {
  const [activePage, setActivePage] = useState<AppPage>("home");
  const [journalsResult, setJournalsResult] = useState<{ journals: Journal[]; source: "local" | "mock" | "empty" }>(() => loadJournalsWithSource());
  const [selectedJournalId, setSelectedJournalId] = useState(() => loadSelectedJournalId());
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences());
  const [animKey, setAnimKey] = useState(0);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [showStaleTaskNotice, setShowStaleTaskNotice] = useState(false);
  const [companionReady, setCompanionReady] = useState<boolean | null>(null);
  const [companionReveal, setCompanionReveal] = useState(() => loadCompanionReveal());
  const journalsInitRef = useRef(false);

  // Companion onboarding gating: check localStorage flag first, then verify with backend
  useEffect(() => {
    const userId = getCurrentUserId();
    checkCompanionOnboardingStatus(userId).then((status) => {
      setCompanionReady(status.completed);
      if (status.reveal) {
        saveCompanionReveal(status.reveal);
        setCompanionReveal(status.reveal);
      }
    }).catch(() => {
      setCompanionReady(window.localStorage.getItem("journal-app:companionReady") === "true");
    });
  }, []);

  const journals = journalsResult.journals;

  // Recover stale tasks on app startup - mark running tasks as failed
  useEffect(() => {
    if (!companionReady) return;
    const tasks = taskStore.loadTasks();
    const runningTasks = tasks.filter((t) => t.status === "running");

    if (runningTasks.length > 0) {
      runningTasks.forEach((task) => {
        taskStore.upsertTask({
          ...task,
          status: "failed",
          error: {
            code: "STALE_TASK",
            message: "App was closed while task was running. Please try again.",
            retryable: true,
          },
          updatedAt: new Date().toISOString(),
        });
      });
      setShowStaleTaskNotice(true);
      setTimeout(() => setShowStaleTaskNotice(false), 5000);
    }
  }, [companionReady]);

  useEffect(() => {
    // Only save if we have actual data (not empty initial state)
    // journalsResult.source tells us if this is real local data
    if (journalsResult.source === "empty" && journals.length === 0) return;
    saveJournals(journals);
  }, [journals, journalsResult.source]);

  useEffect(() => {
    saveSelectedJournalId(selectedJournalId);
  }, [selectedJournalId]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Check backend health on mount
  useEffect(() => {
    if (!companionReady) return;
    checkBackendHealth().then(ok => {
      setBackendStatus(ok ? "online" : "offline");
    });
  }, [companionReady]);

  // Load journals from backend on startup (with localStorage fallback)
  useEffect(() => {
    if (!companionReady) return;
    if (journalsInitRef.current) return;
    journalsInitRef.current = true;

    loadJournalsWithBackendFallback().then(async result => {
      setJournalsResult({ ...result, journals: stripDailySummaries(result.journals) });
      // Migrate localStorage journals to backend after loading
      // Only runs once; subsequent calls skip due to migrationMarker
      const migrationResult = await migrateLocalStorageJournalsToBackend();
      if (migrationResult.migrated > 0) {
        console.log(`[App] Migration complete: ${migrationResult.migrated} journals migrated to backend`);
        // Refresh journals from backend after migration
        const refreshed = await loadJournalsWithBackendFallback();
        setJournalsResult({ ...refreshed, journals: stripDailySummaries(refreshed.journals) });
      }
    });
  }, [companionReady]);

  // Auto-generate girlfriend selfies when app loads
  const [autoGenError, setAutoGenError] = useState<string | null>(null);
  const [autoGenSource, setAutoGenSource] = useState<"remote" | "fallback" | null>(null);

  function replaceVoiceMessagesForJournalGroup(
    currentJournals: Journal[],
    journalId: string,
    voiceMessages: Journal["voiceMessages"],
  ) {
    return currentJournals.map((journal) => {
      if (journal.id === journalId) {
        return { ...journal, voiceMessages };
      }
      return journal;
    });
  }

  function ensureJournalVoices(journal: Journal) {
    if (!journal.voiceMessages.length) return;
    if (journal.voiceMessages.every((message) => message.audioUrl)) return;
    // Prevent concurrent TTS requests for the same journal
    if (journal.ttsStatus === "loading") return;

    const journalId = journal.id;
    setJournalsResult((current) => ({
      ...current,
      journals: current.journals.map((j) =>
        j.id === journalId ? { ...j, ttsStatus: "loading" as const } : j
      ),
    }));

    synthesizeVoiceMessages(journal.voiceMessages, {
      mood: journal.mood,
      voiceStyle: journal.voiceStyle,
    }).then((result) => {
      if (result.error) {
        console.error("[TTS] 语音合成失败:", result.error);
        setJournalsResult((current) => ({
          ...current,
          journals: current.journals.map((j) =>
            j.id === journalId ? { ...j, ttsStatus: "error" as const } : j
          ),
        }));
        return;
      }
      setJournalsResult((current) => ({
        ...current,
        journals: current.journals.map((j) =>
          j.id === journalId ? { ...j, ttsStatus: "ready" as const } : j
        ),
      }));
      setJournalsResult((current) => ({
        ...current,
        journals: replaceVoiceMessagesForJournalGroup(current.journals, journalId, result.voiceMessages),
      }));
    }).catch((err) => {
      console.error("[TTS] 语音合成异常:", err);
      setJournalsResult((current) => ({
        ...current,
        journals: current.journals.map((j) =>
          j.id === journalId ? { ...j, ttsStatus: "error" as const } : j
        ),
      }));
    });
  }

  function ensureTodaySelfie() {
    const today = getTodayString();
    const todayJournal = findLatestJournalByDate(journals, today);
    if (!todayJournal) return;

    const hour = new Date().getHours();
    if (!shouldTriggerMorningSelfie({ hour, hasMorningSelfie: Boolean(todayJournal.selfies?.length) })) return;

    // Prevent concurrent selfie generation requests
    if (todayJournal.selfieStatus === "loading") return;
    const todayId = todayJournal.id;

    const referenceImage = todayJournal.selfies?.[todayJournal.selfies.length - 1] ?? todayJournal.referenceImage;

    setJournalsResult((current) => ({
      ...current,
      journals: current.journals.map((j) =>
        j.id === todayId ? { ...j, selfieStatus: "loading" as const } : j
      ),
    }));

    generateGirlfriendSelfies(todayJournal.mood, referenceImage, todayJournal.content, todayJournal.date)
      .then((result) => {
        // Morning selfie success is primary flow success - evening warning is just a warning
        if (!result.morningSelfie) {
          if (result.error) console.error("[晨间自拍] 生成失败:", result.error);
          setJournalsResult((current) => ({
            ...current,
            journals: current.journals.map((j) =>
              j.id === todayId ? { ...j, selfieStatus: "error" as const } : j
            ),
          }));
          return;
        }

        saveLatestSelfie(result.morningSelfie);
        setJournalsResult((current) => {
          const updated = current.journals.map((journal) =>
            journal.id === todayId
              ? { ...journal, selfies: [...(journal.selfies ?? []), result.morningSelfie!], selfieStatus: "ready" as const }
              : journal
          );
          // P0-4: Persist selfie update to backend
          const updatedJournal = updated.find(j => j.id === todayId);
          if (updatedJournal) {
            saveJournalToBackend(updatedJournal).catch(err => console.error("[Selfie] Failed to save:", err));
          }
          return { ...current, journals: updated };
        });
        if (result.eveningWarning) {
          console.warn("[晨间自拍] 晚间加餐失败:", result.eveningWarning);
        }
      })
      .catch((err) => {
        console.error("[晨间自拍] 生成异常:", err);
        setJournalsResult((current) => ({
          ...current,
          journals: current.journals.map((j) =>
            j.id === todayId ? { ...j, selfieStatus: "error" as const } : j
          ),
        }));
      });
  }

  useEffect(() => {
    if (!companionReady) return;
    // Rebuild memory from persisted journals exactly once on startup
    const rebuildResult = rebuildMemoryFromJournals(journalsResult.journals);
    getMemoryEngine().seed(rebuildResult.entries);
  }, [companionReady]);

  // Auto-generate today's journal exactly once using a ref to track initialization
  const initRef = useRef(false);

  useEffect(() => {
    if (!companionReady) return;
    if (initRef.current) return;
    initRef.current = true;

    const today = getTodayString();
    // Check against current state — this runs once at mount
    const todayJournal = findLatestJournalByDate(journalsResult.journals, today);

    if (!todayJournal) {
      (async () => {
        // Before generating, confirm with backend that no journal exists for today
        const existsOnBackend = await journalExistsOnBackend(today);
        if (existsOnBackend) {
          // Backend has today's journal — refresh from backend and skip generation
          const result = await loadJournalsWithBackendFallback();
          setJournalsResult(result);
          return;
        }

        const referenceImage = await loadValidReferenceImage();
        const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];

        try {
          // Step 1: Generate journal content (text + voice scripts)
          const draft = await generateJournalDraft({
            mood: randomMood,
            date: today,
            memoryEngine: getMemoryEngine(),
            voiceStyle: preferences.voiceStyle,
          });

          // Step 2: Generate selfies using stable reference image
          const selfieResult = await generateGirlfriendSelfies(randomMood, referenceImage ?? undefined);

          setAutoGenSource(draft.source);
          // Morning selfie success = primary flow success; evening failure is just a warning
          if (selfieResult.error) {
            console.error("[自动生成] 女友自拍失败:", selfieResult.error);
            setAutoGenError(selfieResult.error);
          }
          // Save latest selfie separately (NOT as character reference)
          if (selfieResult.morningSelfie) {
            saveLatestSelfie(selfieResult.morningSelfie);
            // Also convert to stable base64 for future reference
            await saveReferenceImageAsBase64(selfieResult.morningSelfie);
          }
          if (selfieResult.eveningWarning) {
            console.warn("[自动生成] 晚间加餐失败:", selfieResult.eveningWarning);
          }

          const newJournal: Journal = {
            id: `auto-${today}`,
            date: today,
            weekday: getWeekday(today),
            mood: randomMood,
            source: "girlfriend",
            content: draft.content,
            selfies: selfieResult.morningSelfie ? [selfieResult.morningSelfie] : undefined,
            referenceImage: referenceImage ?? undefined,  // Use stable reference, not latest selfie
            voiceMessages: draft.voiceMessages,
          };

          const entry = toJournalEntry(newJournal);
          setJournalsResult((current) => ({
            ...current,
            journals: [entry, ...current.journals.filter((journal) => journal.id !== entry.id)],
          }));
          setSelectedJournalId(entry.id);
          addJournalToMemory(entry);
          ensureJournalVoices(entry);

          saveJournalToBackend(entry).catch(err => {
            console.error("[AutoGen] Failed to save to backend:", err);
          });
        } catch (err) {
          console.error("Failed to generate today's journal:", err);
          setAutoGenError("生成失败，请稍后重试");
        }
      })();
    } else {
      ensureTodaySelfie();
    }
  }, [companionReady]);

  useEffect(() => {
    if (!companionReady) return;
    ensureTodaySelfie();
  }, [companionReady, journals]);

  // Night bonus selfie: generate at 21:00+ for today's summary if no night bonus yet
  useEffect(() => {
    if (!companionReady) return;
    const today = getTodayString();
    const selected = findLatestJournalByDate(journals, today);
    if (!selected) return;
    if (selected.nightBonusSelfie) return;
    const hour = new Date().getHours();
    if (!shouldTriggerNightBonus({ hour, hasNightBonusSelfie: Boolean(selected.nightBonusSelfie) })) return;

    // Use the last selfie as reference image for night bonus
    const referenceImage = selected.selfies?.[selected.selfies.length - 1] ?? selected.referenceImage;
    generateNightBonusSelfie(selected.mood, referenceImage)
      .then((result) => {
        if (result.error) {
          console.error("[夜间加餐] 生成失败:", result.error);
          return;
        }
        if (!result.selfie) return;

        const nightSelfie = result.selfie;
        saveLatestSelfie(nightSelfie);
        setJournalsResult((current) =>
          ({ ...current, journals: current.journals.map((j) =>
            j.id === selected.id ? { ...j, nightBonusSelfie: nightSelfie } : j
          )})
        );
        // P0-4: Persist night bonus selfie to backend
        const updatedJournal = journals.find(j => j.id === selected.id);
        if (updatedJournal) {
          saveJournalToBackend({ ...updatedJournal, nightBonusSelfie: nightSelfie }).catch(err =>
            console.error("[NightBonus] Failed to save:", err)
          );
        }
      })
      .catch((err) => {
        console.error("[夜间加餐] 生成异常:", err);
      });
  }, [companionReady, journals]);

  // Poll for daily greeting tasks
  const greetingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!companionReady) return;
    async function pollGreetings() {
      try {
        const res = await fetch("/api/generation/tasks?type=daily_greeting&status=succeeded");
        if (!res.ok) return;
        const data = await res.json() as { tasks?: Array<{ id: string; output: Record<string, unknown>; completedAt?: string }> };
        if (!data.tasks?.length) return;
        const existingIds = greetingStore.getGreetingIds();
        for (const task of data.tasks) {
          if (existingIds.has(task.id)) continue;
          const output = task.output ?? {};
          const card: GreetingCard = {
            id: task.id,
            timing: (output.timing as GreetingCard["timing"]) ?? "morning",
            content: (output.greetingContent as string) ?? "",
            audioUrl: (output.audioUrl as string) || undefined,
            deliveredAt: task.completedAt ?? new Date().toISOString(),
          };
          greetingStore.addGreeting(card);
        }
      } catch { /* silent */ }
    }

    pollGreetings();
    greetingPollRef.current = setInterval(pollGreetings, 30_000);
    return () => {
      if (greetingPollRef.current) clearInterval(greetingPollRef.current);
    };
  }, [companionReady]);

  function handleSaveJournal(journal: Journal) {
    const entry = toJournalEntry(journal);
    // Update UI state immediately
    setJournalsResult((current) => {
      const nextJournals = [entry, ...current.journals.filter((item) => item.id !== entry.id)];
      return { ...current, journals: nextJournals };
    });
    setSelectedJournalId(entry.id);
    setActivePage("home");
    addJournalToMemory(entry);
    ensureJournalVoices(entry);

    saveJournalToBackend(entry).then((entryOk) => {
      if (!entryOk) {
        console.warn("[App] Backend save failed, keeping local state only");
        saveJournals([entry, ...journals.filter((item) => item.id !== entry.id)]);
      }
    });
  }

  function handleSelectJournal(id: string) {
    setSelectedJournalId(id);
    setActivePage("home");
    const journal = journals.find((item) => item.id === id);
    if (journal) ensureJournalVoices(journal);
  }

  function handleNavigate(page: AppPage) {
    if (page === activePage) return;
    setActivePage(page);
    setAnimKey(k => k + 1);
  }

  return (
    companionReady === false ? (
      <CompanionOnboardingPage
        onCompleted={(result) => {
          window.localStorage.setItem("journal-app:companionReady", "true");
          saveCompanionReveal(result.reveal);
          setCompanionReveal(result.reveal);
          setCompanionReady(true);
        }}
      />
    ) : companionReady === null ? null : (
    <div className="app-shell">
      <Header activePage={activePage} onNavigate={handleNavigate} />

      {backendStatus === "offline" ? (
        <div className="auto-gen-error banner" role="alert" style={{ background: "#FFEBEE", color: "#C62828" }}>
          <span>⚠️ 后端服务未启动。语音、图片、AI 内容生成不可用。请启动 backend 服务。</span>
          <button type="button" className="ghost-button" onClick={() => {
            checkBackendHealth().then(ok => {
              setBackendStatus(ok ? "online" : "offline");
            });
          }}>重试</button>
        </div>
      ) : null}

      {showStaleTaskNotice ? (
        <div className="auto-gen-error banner" role="status" style={{ background: "#FFF3E0", color: "#E65100" }}>
          <span>⚠️ 有任务因应用意外关闭而失败，请尝试重新生成。</span>
          <button type="button" className="ghost-button" onClick={() => setShowStaleTaskNotice(false)}>知道了</button>
        </div>
      ) : null}

      {autoGenError ? (
        <div className="auto-gen-error banner" role="alert">
          <span>⚠️ 自动生成失败：{autoGenError}</span>
          <button type="button" className="ghost-button" onClick={() => {
            setAutoGenError(null);
            setAutoGenSource(null);
            initRef.current = false;  // Allow retry
          }}>重试</button>
          <button type="button" className="ghost-button" onClick={() => setAutoGenError(null)}>关闭</button>
        </div>
      ) : autoGenSource === "fallback" ? (
        <div className="auto-gen-error banner" role="status" style={{ background: "#FFF3E0", color: "#E65100" }}>
          <span>📋 当前内容使用本地模板生成（远程服务不可用）</span>
          <button type="button" className="ghost-button" onClick={() => setAutoGenSource(null)}>知道了</button>
        </div>
      ) : null}

      <main className="app-main">
        <div key={`page-${animKey}`} className="page-content">
          {activePage === "home" ? (
            <HomePage
              journals={journals}
              dataSource={journalsResult.source}
              selectedJournalId={selectedJournalId}
              onSelectJournal={handleSelectJournal}
              onCreateNew={() => handleNavigate("write")}
              onAskHerWrite={() => handleNavigate("ask-her")}
              companionReveal={companionReveal}
            />
          ) : null}

          {activePage === "write" ? (
            <WritePage
              onSave={handleSaveJournal}
              onCancel={() => handleNavigate("home")}
              voiceStyle={preferences.voiceStyle}
            />
          ) : null}

          {activePage === "ask-her" ? (
            <AskHerPage
              onSave={handleSaveJournal}
              onCancel={() => handleNavigate("home")}
              voiceStyle={preferences.voiceStyle}
            />
          ) : null}

          {activePage === "photo-wall" ? (
            <PhotoWallPage journals={journals} />
          ) : null}

          {activePage === "settings" ? (
            <SettingsPage
              preferences={preferences}
              onChange={setPreferences}
            />
          ) : null}

          {activePage === "greetings" ? (
            <GreetingPage
              onBack={() => handleNavigate("home")}
            />
          ) : null}
        </div>
      </main>
    </div>
    )
  );
}
