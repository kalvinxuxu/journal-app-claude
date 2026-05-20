/**
 * Content orchestration contracts — defines boundaries between:
 * - Layer 1: Generation (女友声音)
 * - Layer 2: Polish / Counselor (编辑层)
 */

import type { VoiceMessage } from "../types/journal";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type VoiceScript = {
  timing: string;
  transcript: string;
  duration: string;
};

// ---------------------------------------------------------------------------
// Layer 1: Generation output
// ---------------------------------------------------------------------------

export type GeneratedContent = {
  journal: string;
  voiceScripts: Array<{ timing: string; transcript: string; duration: string }>;
  source: "remote" | "fallback";
  recallUsed: boolean;
  raw: true; // signals content needs Polish pass
};

// ---------------------------------------------------------------------------
// Layer 2: Polish output
// ---------------------------------------------------------------------------

export type ModificationAction = "passed" | "replaced" | "truncated" | "rejected";

export type ModificationLog = {
  rule: string;
  path: "journal" | `voice[${number}]`;
  before: string;
  after: string;
  action: ModificationAction;
};

export type PolishResult = {
  journal: string;
  voiceScripts: Array<{ timing: string; transcript: string; duration: string }>;
  modifications: ModificationLog[];
  blocked: boolean;
};

// ---------------------------------------------------------------------------
// Negotiation result (what journalGeneration returns after polish)
// ---------------------------------------------------------------------------

export type NegotiatedContent = {
  journal: string;
  voiceMessages: VoiceMessage[];
  modifications: ModificationLog[];
  blocked: boolean;
  memoryActivated: boolean;
  source: "remote" | "fallback";
};