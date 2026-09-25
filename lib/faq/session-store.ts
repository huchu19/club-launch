// Per-visitor, per-tab store of questions asked this session (sessionStorage).
// Pending answers are only ever shown to the person who asked (docs/SPEC.md §5).
// Read through useSyncExternalStore so server and client renders agree.

export type SessionFaq = {
  id: string
  question: string
  answer: string
  status: 'approved' | 'pending'
}

const listeners = new Set<() => void>()
const EMPTY: SessionFaq[] = []
const cache = new Map<string, { raw: string | null; items: SessionFaq[] }>()

export const sessionKey = (clubSlug: string) => `club-launch:faq-session:${clubSlug}`

function readRaw(clubSlug: string): string | null {
  try {
    return window.sessionStorage.getItem(sessionKey(clubSlug))
  } catch {
    return null
  }
}

function parse(raw: string | null): SessionFaq[] {
  if (!raw) return EMPTY
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value)
      ? value.filter(
          (item): item is SessionFaq =>
            typeof item?.id === 'string' &&
            typeof item?.question === 'string' &&
            typeof item?.answer === 'string',
        )
      : EMPTY
  } catch {
    return EMPTY
  }
}

/** Snapshot with a stable identity while the stored value is unchanged. */
export function getSessionFaqs(clubSlug: string): SessionFaq[] {
  const raw = readRaw(clubSlug)
  const cached = cache.get(clubSlug)
  if (cached && cached.raw === raw) return cached.items
  const items = parse(raw)
  cache.set(clubSlug, { raw, items })
  return items
}

export function getServerSessionFaqs(): SessionFaq[] {
  return EMPTY
}

export function subscribeSessionFaqs(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function addSessionFaq(clubSlug: string, item: SessionFaq): void {
  const next = [...getSessionFaqs(clubSlug).filter((i) => i.id !== item.id), item]
  try {
    window.sessionStorage.setItem(sessionKey(clubSlug), JSON.stringify(next))
  } catch {
    // Storage unavailable (private mode): keep the item in memory for this page view.
    cache.set(clubSlug, { raw: readRaw(clubSlug), items: next })
  }
  listeners.forEach((listener) => listener())
}
