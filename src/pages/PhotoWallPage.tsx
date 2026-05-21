import { useMemo, useState } from "react";
import type { Journal } from "../types/journal";
import { EmptyState } from "../components/EmptyState";
import { buildPhotoWallItems } from "../services/photoWall";

type PhotoWallPageProps = {
  journals: Journal[];
};

export function PhotoWallPage({ journals }: PhotoWallPageProps) {
  const items = useMemo(() => buildPhotoWallItems(journals), [journals]);
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);

  if (items.length === 0) {
    return <EmptyState title="照片墙还是空的" description="等生成更多照片后，这里会慢慢贴满回忆。" />;
  }

  return (
    <section className="page-stack">
      <div className="page-hero card">
        <div>
          <p className="section-label">照片墙</p>
          <h2>冲洗过的回忆</h2>
          <p className="hero-copy">把所有日记里留下来的照片，都贴进这一面墙。</p>
        </div>
      </div>

      <div className="photo-wall-grid" aria-label="照片墙">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="photo-polaroid"
            style={{ transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)` }}
            onClick={() => setSelectedSrc(item.src)}
          >
            <img src={item.src} alt={`${item.date}-${item.kind}`} />
            <span>{item.date}</span>
          </button>
        ))}
      </div>

      {selectedSrc && (
        <div className="image-gallery-overlay" onClick={() => setSelectedSrc(null)} role="dialog" aria-modal="true">
          <img src={selectedSrc} alt="照片墙预览" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}