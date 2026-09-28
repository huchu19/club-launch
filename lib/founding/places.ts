// Founding member places: a counter of places taken, claimed with optimistic
// concurrency. Each claim reads the counter and its revision, then writes the
// new count only if nobody else has written since; on a clash it reads again
// and retries. Two people can never take the last place.

export type PlacesSnapshot = { taken: number; revision: string | null }

/** Where the count lives: Sanity in production, memory in demo mode and tests. */
export interface PlacesStore {
  read(key: string): Promise<PlacesSnapshot>
  /** Writes `taken` only if the revision still matches; false on a clash. */
  compareAndSet(key: string, expected: string | null, taken: number): Promise<boolean>
}

export const MAX_CLAIM_ATTEMPTS = 20

export type ClaimResult =
  { ok: true; placesLeft: number } | { ok: false; reason: 'sold-out' | 'busy'; placesLeft: number }

export async function claimPlace(
  store: PlacesStore,
  key: string,
  total: number,
): Promise<ClaimResult> {
  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    const { taken, revision } = await store.read(key)
    if (taken >= total) return { ok: false, reason: 'sold-out', placesLeft: 0 }
    if (await store.compareAndSet(key, revision, taken + 1)) {
      return { ok: true, placesLeft: total - taken - 1 }
    }
  }
  // Extremely unlikely: the counter kept changing under us. Ask the visitor to retry.
  const { taken } = await store.read(key)
  return { ok: false, reason: 'busy', placesLeft: Math.max(0, total - taken) }
}

/** Gives a place back, e.g. when the CRM couldn't take the signup. */
export async function releasePlace(store: PlacesStore, key: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    const { taken, revision } = await store.read(key)
    if (taken <= 0) return
    if (await store.compareAndSet(key, revision, taken - 1)) return
  }
}

export function placesLeft(total: number, taken: number): number {
  return Math.max(0, total - taken)
}

/** An in-memory store with revisions, for demo mode and tests. */
export function createMemoryPlacesStore(
  options: { delay?: () => Promise<void> } = {},
): PlacesStore & { taken(key: string): number } {
  const counters = new Map<string, { taken: number; revision: number }>()
  const pause = options.delay ?? (async () => {})
  return {
    async read(key) {
      await pause()
      const counter = counters.get(key)
      return counter
        ? { taken: counter.taken, revision: String(counter.revision) }
        : { taken: 0, revision: null }
    },
    async compareAndSet(key, expected, taken) {
      await pause()
      const counter = counters.get(key)
      const current = counter ? String(counter.revision) : null
      if (current !== expected) return false
      counters.set(key, { taken, revision: (counter?.revision ?? 0) + 1 })
      return true
    },
    taken: (key) => counters.get(key)?.taken ?? 0,
  }
}
