import { useState, useEffect } from "react";
import type { Preferences } from "../types/journal";
import { loadReferenceImage, clearReferenceImage, saveReferenceImage, saveReferenceImageAsBase64, loadValidReferenceImage } from "../services/memory";
import { generateGirlfriendSelfies } from "../services/minimax";
import { scheduleReminder, isReminderSupported } from "../services/reminders";
import { exportToPDF, exportToImage } from "../services/export";
import { loadJournals } from "../services/memory";
import { GIRLFRIEND_PROFILE } from "../services/girlfriendProfile";

type SettingsPageProps = {
  preferences: Preferences;
  onChange: (next: Preferences) => void;
};

export function SettingsPage({ preferences, onChange }: SettingsPageProps) {
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [characterError, setCharacterError] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);

  // Schedule reminder when reminderTime changes
  useEffect(() => {
    if (!preferences.reminderTime) return;
    scheduleReminder(preferences.reminderTime).then((result) => {
      if (result.success) {
        setReminderStatus(`已设置每天 ${preferences.reminderTime} 提醒`);
      } else {
        setReminderStatus(result.error ?? "提醒设置失败");
      }
      const timer = setTimeout(() => setReminderStatus(null), 3000);
      return () => clearTimeout(timer);
    });
  }, [preferences.reminderTime]);

  async function handleRegenerateCharacter() {
    setIsRegenerating(true);
    setCharacterError(null);
    // Get current reference for generation (don't clear until success)
    const currentReference = await loadValidReferenceImage();

    try {
      // Generate new character first
      const result = await generateGirlfriendSelfies("开心", currentReference ?? undefined);
      // Morning success = primary flow success; evening failure is just a warning
      if (!result.morningSelfie) {
        setCharacterError(result.error ?? "生成失败");
        setIsRegenerating(false);
        return;
      }
      // Convert to stable base64 before storing (prevents URL expiration)
      await saveReferenceImageAsBase64(result.morningSelfie);
      setCharacterImage(result.morningSelfie);
      if (result.eveningWarning) {
        console.warn("[设置页] 晚间加餐失败:", result.eveningWarning);
      }
    } catch (err) {
      console.error("Failed to regenerate character:", err);
      setCharacterError("生成女友形象失败，请稍后重试。");
    } finally {
      setIsRegenerating(false);
    }
  }

  function handleExport() {
    if (preferences.exportMode === "none") return;
    const journals = loadJournals();
    const journal = journals[0];
    if (!journal) {
      setExportToast("没有可导出的日记");
      setTimeout(() => setExportToast(null), 2000);
      return;
    }
    if (preferences.exportMode === "pdf") {
      exportToPDF(journal);
      setExportToast("正在打开打印窗口...");
    } else {
      exportToImage(journal);
      setExportToast("图片导出开发中");
    }
    setTimeout(() => setExportToast(null), 2500);
  }

  const savedReference = loadReferenceImage();

  return (
    <section className="page-stack">
      <div className="page-hero card settings-hero">
        <div>
          <p className="section-label">设置</p>
          <h2>先把偏好记住</h2>
          <p className="hero-copy">提醒时间、语音风格、导出方式都先用本地状态占位。</p>
        </div>

        <div className="settings-hero__chips" aria-label="设置摘要">
          <span>本地保存</span>
          <span>可后续同步</span>
          <span>适合原型</span>
        </div>
      </div>

      <div className="settings-panel card">
        <div className="settings-panel__top">
          <div>
            <p className="section-label">偏好配置</p>
            <h3>先把最常用的项放在前面</h3>
          </div>
          <span className="settings-panel__hint">保持轻量</span>
        </div>

        <div className="form-grid">
        <label className="field">
          <span>提醒时间</span>
          <input
            type="time"
            value={preferences.reminderTime}
            onChange={(event) => onChange({ ...preferences, reminderTime: event.target.value })}
          />
          <span className="field-hint">每天 {preferences.reminderTime || "09:00"} 提醒</span>
        </label>

        <label className="field">
          <span>语音风格</span>
          <select
            value={preferences.voiceStyle}
            onChange={(event) =>
              onChange({
                ...preferences,
                voiceStyle: event.target.value as Preferences["voiceStyle"],
              })
            }
          >
            <option value="warm">温暖</option>
            <option value="soft">轻柔</option>
            <option value="playful">调皮</option>
          </select>
        </label>

        <label className="field field--full">
          <span>导出方式</span>
          <select
            value={preferences.exportMode}
            onChange={(event) =>
              onChange({
                ...preferences,
                exportMode: event.target.value as Preferences["exportMode"],
              })
            }
          >
            <option value="pdf">PDF</option>
            <option value="image">图片</option>
            <option value="none">暂不导出</option>
          </select>
          {preferences.exportMode !== "none" && (
            <button
              type="button"
              className="ghost-button export-confirm-btn"
              onClick={handleExport}
            >
              确认导出
            </button>
          )}
        </label>
      </div>
      </div>

      {exportToast && (
        <div className="toast-notice card" role="status" aria-live="polite">
          <p>{exportToast}</p>
        </div>
      )}

      {reminderStatus && (
        <div className="toast-notice card" role="status" aria-live="polite">
          <p>{reminderStatus}</p>
        </div>
      )}

      <div className="detail-card card settings-note">
        <p className="section-label">下一步</p>
        <p>等你确认后，我可以继续接入真实生成接口、记忆持久化和语音能力。</p>
      </div>

      <div className="settings-panel card">
        <div className="settings-panel__top">
          <div>
            <p className="section-label">女友形象</p>
            <h3>人物一致性</h3>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={handleRegenerateCharacter}
            disabled={isRegenerating}
          >
            {isRegenerating ? "生成中..." : "重新生成"}
          </button>
        </div>

        {isRegenerating ? (
          <div className="character-preview character-preview--loading" aria-label="生成中">
            <div className="character-loading-ring" />
          </div>
        ) : characterImage ? (
          <div className="character-preview">
            <img src={characterImage} alt="女友形象" />
          </div>
        ) : (
          <p className="character-hint">
            {savedReference
              ? "重新生成可更新女友形象"
              : "点击「重新生成」可创建女友形象"}
          </p>
        )}

        {characterError && (
          <p className="character-error" role="alert">{characterError}</p>
        )}

        <p className="character-hint">
          当前人设：{GIRLFRIEND_PROFILE.name}，{GIRLFRIEND_PROFILE.archetype}。
          性格偏{GIRLFRIEND_PROFILE.personality.slice(0, 3).join("、")}。
        </p>
        <p className="character-hint">
          说话风格：`soft` {GIRLFRIEND_PROFILE.speakingStyle.soft}；`warm` {GIRLFRIEND_PROFILE.speakingStyle.warm}；`playful` {GIRLFRIEND_PROFILE.speakingStyle.playful}。
        </p>
      </div>

      <div className="detail-card card settings-about">
        <p className="section-label">关于</p>
        <h3>情侣日记</h3>
        <p className="settings-about__version">版本 0.1.0 (原型)</p>
        <p className="settings-about__desc">
          一个记录情感、维护记忆的私人日记应用。每日生成专属内容，配合语音留言功能，用温柔的方式陪伴彼此。
        </p>
        <div className="settings-about__stack">
          <span>React + TypeScript</span>
          <span>MiniMax API</span>
          <span>Vite + Vitest</span>
        </div>
      </div>
    </section>
  );
}
