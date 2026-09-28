// The day plan a visitor chose to attach to their tour request, kept in
// sessionStorage so it survives a reload. Only the plan's public id and day are
// stored. Read through useSyncExternalStore so server and client renders agree.

export type SharedDayPlan = { clubSlug: string; id: string; day: string }

const KEY = 'club-launch:tour-day-plan'
const listeners = new Set<() => void>()
let cache: { raw: string | null; value: SharedDayPlan | null } = { raw: null, value: null }
/** Used when sessionStorage is unavailable (for example some private windows). */
let memory: string | null = null

function readRaw(): string | null {
  try {
    return window.sessionStorage.getItem(KEY)
  } catch {
    return memory
  }
}

function write(raw: string | null): void {
  memory = raw
  try {
    if (raw === null) window.sessionStorage.removeItem(KEY)
    else window.sessionStorage.setItem(KEY, raw)
  } catch {
    // Kept in memory for this page view.
  }
  listeners.forEach((listener) => listener())
}

function parse(raw: string | null): SharedDayPlan | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<SharedDayPlan> | null
    // The id must pass the tour form's own validation, or it could never be sent.
    return typeof value?.clubSlug === 'string' &&
      typeof value.id === 'string' &&
      /^[a-z0-9]{8,32}$/.test(value.id) &&
      typeof value.day === 'string'
      ? { clubSlug: value.clubSlug, id: value.id, day: value.day }
      : null
  } catch {
    return null
  }
}

/** The plan attached to this club's tour form, with a stable identity while unchanged. */
export function getSharedDayPlan(clubSlug: string): SharedDayPlan | null {
  const raw = readRaw()
  if (cache.raw !== raw) cache = { raw, value: parse(raw) }
  return cache.value?.clubSlug === clubSlug ? cache.value : null
}

export function getServerSharedDayPlan(): SharedDayPlan | null {
  return null
}

export function subscribeSharedDayPlan(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function shareDayPlan(plan: SharedDayPlan): void {
  write(JSON.stringify(plan))
}

export function clearSharedDayPlan(): void {
  write(null)
}
