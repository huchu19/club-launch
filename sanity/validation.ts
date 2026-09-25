import { findPlaceholders, placeholderSummary } from '../lib/placeholders'

/**
 * Document-level rule for club pages: an error (which blocks publishing in
 * Sanity) while any [[placeholder]] remains anywhere in the document.
 */
export function placeholderRule(doc: unknown): true | string {
  const found = findPlaceholders(doc)
  if (found.length === 0) return true
  return `Replace ${found.length} placeholder${found.length === 1 ? '' : 's'} before publishing: ${placeholderSummary(found)}`
}
