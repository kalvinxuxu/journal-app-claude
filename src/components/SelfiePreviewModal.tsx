import type { Mood } from "../types/journal";

export type SelfiePreviewModalProps = {
  selfieUrl: string;
  mood: Mood;
  onSave: (selfieUrl: string) => void;
  onRegenerate: () => void;
  onSkip: () => void;
};

const moodLabel: Record<Mood, string> = {
  "开心": "开心",
  "想念": "想念",
  "感动": "感动",
  "平静": "平静",
  "调皮": "调皮",
};

export function SelfiePreviewModal({
  selfieUrl,
  mood,
  onSave,
  onRegenerate,
  onSkip,
}: SelfiePreviewModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="自拍预览">
      <div className="modal-content card">
        <div className="modal-header">
          <p className="section-label">检测到新自拍</p>
          <h3>今天的{moodLabel[mood]}时刻</h3>
        </div>

        <div className="selfie-preview">
          <img src={selfieUrl} alt={`${moodLabel[mood]}表情自拍`} />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={onSkip}
          >
            跳过
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={onRegenerate}
          >
            重新生成
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onSave(selfieUrl)}
          >
            保存到日记
          </button>
        </div>
      </div>
    </div>
  );
}