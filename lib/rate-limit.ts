// Sliding-window rate limiter held in memory.
// Per instance only: on serverless each warm instance keeps its own window, so
// the effective limit across a deployment can be higher. Good enough to stop
// casual abuse on free tiers; a shared store (e.g. Redis) would make it global.

export type RateLimitResult =
  { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number }

export type RateLimiter = {
  check(key: string): RateLimitResult
  reset(): void
}

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
  maxKeys = 10_000,
}: {
  limit: number
  windowMs: number
  now?: () => number
  /** Oldest keys are evicted beyond this, bounding memory. */
  maxKeys?: number
}): RateLimiter {
  const hits = new Map<string, number[]>()

  return {
    check(key) {
      const current = now()
      const recent = (hits.get(key) ?? []).filter((t) => current - t < windowMs)

      if (recent.length >= limit) {
        hits.set(key, recent)
        const oldest = recent[0] ?? current
        return {
          ok: false,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - current) / 1000)),
        }
      }

      recent.push(current)
      hits.delete(key) // re-insert so Map order tracks recency for eviction
      hits.set(key, recent)
      if (hits.size > maxKeys) {
        const oldestKey = hits.keys().next().value
        if (oldestKey !== undefined) hits.delete(oldestKey)
      }
      return { ok: true, remaining: limit - recent.length }
    },
    reset() {
      hits.clear()
    },
  }
}
