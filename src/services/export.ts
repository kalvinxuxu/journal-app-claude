/**
 * Export service for journal entries.
 * Currently supports PDF via print dialog and image export placeholder.
 */

import type { Journal } from "../types/journal";

export type ExportMode = "pdf" | "image" | "none";

function buildJournalPrintHTML(journal: Journal): string {
  const moodLabel: Record<string, string> = {
    "开心": "开心 😊",
    "想念": "想念 💭",
    "感动": "感动 🥹",
    "平静": "平静 🌿",
    "调皮": "调皮 😏",
  };

  const voiceTimingLabel: Record<string, string> = {
    morning: "早安",
    afternoon: "午后",
    night: "晚安",
  };

  const voiceSection = journal.voiceMessages.length > 0
    ? `
      <section class="voice-section">
        <h3>语音留言</h3>
        ${journal.voiceMessages.map(vm => `
          <div class="voice-item">
            <strong>${voiceTimingLabel[vm.timing] || vm.timing}</strong>
            <p>${vm.transcript}</p>
          </div>
        `).join("")}
      </section>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>日记 - ${journal.date}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; color: #212121; }
        .header { margin-bottom: 32px; border-bottom: 1px solid #E0E0E0; padding-bottom: 16px; }
        .header h1 { font-size: 24px; font-weight: 500; }
        .header .meta { color: #757575; font-size: 13px; margin-top: 8px; }
        .mood { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 13px; margin-top: 8px; }
        .mood-happy { background: #E8F5E9; color: #2E7D32; }
        .mood-miss { background: #E3F2FD; color: #1565C0; }
        .mood-touch { background: #FFF3E0; color: #E65100; }
        .mood-calm { background: #E0F7FA; color: #006064; }
        .mood-playful { background: #F3E5F5; color: #6A1B9A; }
        .content { font-size: 15px; line-height: 1.8; white-space: pre-wrap; margin-bottom: 32px; }
        .voice-section { border-top: 1px solid #E0E0E0; padding-top: 20px; }
        .voice-section h3 { font-size: 14px; font-weight: 500; margin-bottom: 16px; }
        .voice-item { margin-bottom: 16px; }
        .voice-item strong { font-size: 13px; color: #424242; }
        .voice-item p { font-size: 14px; color: #424242; margin-top: 4px; }
        .images { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
        .images img { max-width: 280px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${journal.date} ${journal.weekday}</h1>
        <div class="meta">${journal.date}</div>
        <span class="mood mood-${journal.mood === "开心" ? "happy" : journal.mood === "想念" ? "miss" : journal.mood === "感动" ? "touch" : journal.mood === "平静" ? "calm" : "playful"}">${moodLabel[journal.mood] || journal.mood}</span>
      </div>
      ${journal.images && journal.images.length > 0 ? `<div class="images">${journal.images.map(url => `<img src="${url}" alt="日记配图" />`).join("")}</div>` : ""}
      <div class="content">${journal.content}</div>
      ${voiceSection}
    </body>
    </html>
  `;
}

export function exportToPDF(journal: Journal): void {
  const html = buildJournalPrintHTML(journal);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export function exportToImage(_journal: Journal): void {
  console.warn("[Export] Image export not yet implemented - use PDF for now");
}