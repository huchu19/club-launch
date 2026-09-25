/**
 * Canonical form of a visitor question, used to recognise repeats without
 * calling the model (docs/SPEC.md §5): lower-case, trimmed, punctuation
 * stripped, whitespace collapsed. Apostrophes vanish ("what's" → "whats");
 * other punctuation becomes a space so "gym/pool" stays two words.
 */
export function normalizeQuestion(question: string): string {
  return question
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
