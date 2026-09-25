// Placeholders mark facts the AI drafter was not allowed to invent, e.g.
// "[[PRICE: monthly membership]]". Pages containing any "[[" cannot be
// published (Studio validation) and show a warning banner.

export type Placeholder = {
  /** The full token as written, e.g. "[[PRICE: monthly membership]]". */
  raw: string
  /** Upper-case kind before the colon, e.g. "PRICE". "UNKNOWN" if malformed. */
  kind: string
  /** Human description after the colon. */
  label: string
  /** Dot path to the field containing it, e.g. "blocks[2].plans[0].pricePerMonth". */
  path: string
}

const TOKEN = /\[\[\s*([A-Za-z _-]+?)\s*:\s*([^\]]*?)\s*\]\]/g

/** True if the text contains anything that looks like a placeholder, well-formed or not. */
export function hasPlaceholderMarker(text: string): boolean {
  return text.includes('[[')
}

function fromString(text: string, path: string): Placeholder[] {
  if (!hasPlaceholderMarker(text)) return []
  const found: Placeholder[] = []
  for (const match of text.matchAll(TOKEN)) {
    found.push({
      raw: match[0],
      kind: (match[1] ?? '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_'),
      label: (match[2] ?? '').trim(),
      path,
    })
  }
  // A stray "[[" without a well-formed token still blocks publishing.
  if (found.length === 0) {
    found.push({ raw: '[[', kind: 'UNKNOWN', label: 'Unfinished placeholder', path })
  }
  return found
}

/**
 * Recursively collects placeholders from any value (a Sanity document, a
 * block array, a string). System fields (keys starting with "_") are skipped.
 */
export function findPlaceholders(value: unknown, path = ''): Placeholder[] {
  if (typeof value === 'string') return fromString(value, path)
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findPlaceholders(item, `${path}[${i}]`))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      key.startsWith('_') ? [] : findPlaceholders(child, path ? `${path}.${key}` : key),
    )
  }
  return []
}

export function placeholderSummary(placeholders: Placeholder[]): string {
  const unique = [...new Set(placeholders.map((p) => p.raw))]
  const shown = unique.slice(0, 3).join(', ')
  const more = unique.length > 3 ? ` and ${unique.length - 3} more` : ''
  return `${shown}${more}`
}
