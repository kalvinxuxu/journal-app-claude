/**
 * Content sanitization utilities for cleaning LLM-generated text.
 * Removes thinking blocks, prefixes, and other artifacts before UI rendering.
 */

/**
 * Removes DeepSeek/AI thinking blocks: [[模型思考内容]]
 * Also normalizes multiple newlines that may result from block removal.
 */
export function stripThinkBlocks(text: string): string {
  return text
    .replace(/\[\[[\s\S]*?\]\]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Removes common LLM content instruction prefixes that leak into generation output.
 * Examples:
 * - "用户希望我作为AI女友写日记。"
 * - "让我来写："
 * - "我来为你写一段日记："
 */
export function stripContentPrefix(text: string): string {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return "";

  const first = paragraphs[0];
  const prefixPatterns = [
    /^(用户希望|让我来|我来为你|以下是|帮你写|写一段|根据你的要求)/,
    /^['"‘’"][^'"'‘’"]+['"‘’"]?\s*[：:]/,
    /^「[^」]+」\s*/,
  ];

  const isPrefixed = prefixPatterns.some((pattern) => pattern.test(first));
  if (isPrefixed) {
    return paragraphs.slice(1).join("\n").trim();
  }
  return paragraphs.join("\n").trim();
}

/**
 * Apply all sanitization passes to content.
 */
export function sanitizeContent(raw: string): string {
  return stripContentPrefix(stripThinkBlocks(raw));
}