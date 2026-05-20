/**
 * Content post-processing filter — Layer 2 in content orchestration.
 * Applies after generation to enforce:
 * 1. Sensitive word filter → replace
 * 2. Length constraints → truncate / reject
 * 3. Duplicate sentence detection → flag only
 * 4. Tone boundary check → flag or reject
 */

import type { PolishResult, ModificationLog } from "./generationContract";

export type VoiceScript = {
  timing: string;
  transcript: string;
  duration: string;
};

// ---------------------------------------------------------------------------
// Sensitive word replacement map
// ---------------------------------------------------------------------------

const SENSITIVE_REPLACEMENTS: Record<string, string> = {
  "赌场": "游乐场",
  "赌博": "娱乐",
  "吸毒": "休息",
  "毒品": "放松",
  "贷款": "经济压力",
  "借钱": "资金周转",
  "利息": "手续费",
  "债务": "压力",
  "博彩": "游戏",
  "下注": "参与",
};

const CLINGY_PATTERNS = [
  /每分每秒/i,
  /离不开你/i,
  /没有你我就活不下去/i,
  /完全离不开/i,
];

const PREACHY_PATTERNS = [
  /你应该/i,
  /你必须/i,
  /你要记住/i,
  /听话/i,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function replaceSensitive(text: string): { cleaned: string; log: ModificationLog | null } {
  let cleaned = text;
  const before = text;

  for (const [word, replacement] of Object.entries(SENSITIVE_REPLACEMENTS)) {
    const regex = new RegExp(word, "g");
    cleaned = cleaned.replace(regex, replacement);
  }

  if (cleaned !== before) {
    return {
      cleaned,
      log: { rule: "sensitive", path: "journal", before, after: cleaned, action: "replaced" },
    };
  }
  return { cleaned, log: null };
}

function detectToneIssues(text: string) {
  const clingy = CLINGY_PATTERNS.some(p => p.test(text));
  const preachy = PREACHY_PATTERNS.some(p => p.test(text));
  return { clingy, preachy };
}

function splitSentences(text: string): string[] {
  return text.split(/[。！？\n]+/).map(s => s.trim()).filter(s => s.length > 0);
}

function hasExcessiveDuplication(sentences: string[]): boolean {
  if (sentences.length < 3) return false;
  const seen = new Set<string>();
  let duplicates = 0;
  for (const s of sentences) {
    const normalized = s.replace(/\s+/g, "");
    if (seen.has(normalized)) {
      duplicates++;
    } else {
      seen.add(normalized);
    }
  }
  return duplicates > sentences.length * 0.4;
}

function truncateAtSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  let truncated = text.slice(0, maxLen);
  const lastPunct = Math.max(
    truncated.lastIndexOf("。"),
    truncated.lastIndexOf("！"),
    truncated.lastIndexOf("？"),
    truncated.lastIndexOf("，"),
  );
  return lastPunct > maxLen * 0.6 ? truncated.slice(0, lastPunct + 1) : truncated;
}

// ---------------------------------------------------------------------------
// Journal polish
// ---------------------------------------------------------------------------

function polishJournal(raw: string): {
  content: string;
  modifications: ModificationLog[];
  blocked: boolean;
} {
  const modifications: ModificationLog[] = [];
  let content = raw;
  let blocked = false;

  // Rule 1: Sensitive → replace
  const sensitive = replaceSensitive(content);
  if (sensitive.log) {
    modifications.push(sensitive.log);
    content = sensitive.cleaned;
  }

  // Rule 2: Length (30-200)
  const MIN_JOURNAL = 10;
  const MAX_JOURNAL = 200;

  if (content.length < MIN_JOURNAL) {
    modifications.push({ rule: "length", path: "journal", before: content, after: content, action: "rejected" });
    blocked = true;
    return { content, modifications, blocked };
  }

  if (content.length > MAX_JOURNAL) {
    const before = content;
    content = truncateAtSentence(content, MAX_JOURNAL);
    modifications.push({ rule: "length", path: "journal", before, after: content, action: "truncated" });
  }

  // Rule 3: Tone
  const tone = detectToneIssues(content);
  if (tone.clingy && tone.preachy) {
    modifications.push({ rule: "tone", path: "journal", before: content, after: content, action: "rejected" });
    blocked = true;
    return { content, modifications, blocked };
  }
  if (tone.clingy) {
    modifications.push({ rule: "tone", path: "journal", before: content, after: content, action: "passed" });
  }
  if (tone.preachy) {
    modifications.push({ rule: "tone", path: "journal", before: content, after: content, action: "passed" });
  }

  // Rule 4: Duplication → flag only
  if (hasExcessiveDuplication(splitSentences(content))) {
    modifications.push({ rule: "duplication", path: "journal", before: content, after: content, action: "passed" });
  }

  return { content, modifications, blocked };
}

// ---------------------------------------------------------------------------
// Voice script polish
// ---------------------------------------------------------------------------

function polishVoiceScript(script: VoiceScript, index: number): {
  script: VoiceScript;
  modifications: ModificationLog[];
  blocked: boolean;
} {
  const path = `voice[${index}]` as const;
  const modifications: ModificationLog[] = [];
  let content = script.transcript;
  let blocked = false;

  // Rule 1: Sensitive → replace
  const before = content;
  for (const [word, replacement] of Object.entries(SENSITIVE_REPLACEMENTS)) {
    content = content.replace(new RegExp(word, "g"), replacement);
  }
  if (content !== before) {
    modifications.push({ rule: "sensitive", path, before, after: content, action: "replaced" });
  }

  // Rule 2: Length (5-20 chars)
  const MIN_VOICE = 5;
  const MAX_VOICE = 20;

  if (content.length < MIN_VOICE) {
    modifications.push({ rule: "length", path, before: script.transcript, after: content, action: "rejected" });
    blocked = true;
    return { script: { ...script, transcript: content }, modifications, blocked };
  }

  if (content.length > MAX_VOICE) {
    const beforeTrunc = content;
    content = truncateAtSentence(content, MAX_VOICE);
    modifications.push({ rule: "length", path, before: beforeTrunc, after: content, action: "truncated" });
  }

  // Rule 3: Tone → flag only
  const tone = detectToneIssues(content);
  if (tone.clingy || tone.preachy) {
    modifications.push({ rule: "tone", path, before: content, after: content, action: "passed" });
  }

  return { script: { ...script, transcript: content }, modifications, blocked };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function polishContent(
  journalContent: string,
  voiceScripts: VoiceScript[],
): PolishResult {
  const allMods: ModificationLog[] = [];

  const journalResult = polishJournal(journalContent);
  allMods.push(...journalResult.modifications);

  if (journalResult.blocked) {
    return {
      journal: journalResult.content,
      voiceScripts: voiceScripts.map(v => ({ ...v })),
      modifications: allMods,
      blocked: true,
    };
  }

  const polishedScripts: VoiceScript[] = [];
  let blocked = false;

  for (let i = 0; i < voiceScripts.length; i++) {
    const result = polishVoiceScript(voiceScripts[i], i);
    allMods.push(...result.modifications);
    if (result.blocked) blocked = true;
    polishedScripts.push(result.script);
  }

  return {
    journal: journalResult.content,
    voiceScripts: polishedScripts,
    modifications: allMods,
    blocked,
  };
}