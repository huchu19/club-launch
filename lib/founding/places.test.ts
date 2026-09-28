import { describe, expect, it } from 'vitest'
import { claimPlace, createMemoryPlacesStore, placesLeft, releasePlace } from './places'

// Random small pauses between reads and writes interleave parallel claims the
// way concurrent requests would.
const jitter = () => new Promise<void>((resolve) => setTimeout(resolve, Math.random() * 4))

describe('founding places', () => {
  it('claims places until they run out, then reports sold out', async () => {
    const store = createMemoryPlacesStore()
    expect(await claimPlace(store, 'club', 2)).toEqual({ ok: true, placesLeft: 1 })
    expect(await claimPlace(store, 'club', 2)).toEqual({ ok: true, placesLeft: 0 })
    expect(await claimPlace(store, 'club', 2)).toEqual({
      ok: false,
      reason: 'sold-out',
      placesLeft: 0,
    })
  })

  it('never oversells when many people sign up at once', async () => {
    const store = createMemoryPlacesStore({ delay: jitter })
    const total = 10
    const results = await Promise.all(
      Array.from({ length: 40 }, () => claimPlace(store, 'club', total)),
    )
    const won = results.filter((r) => r.ok)
    expect(won).toHaveLength(total)
    expect(store.taken('club')).toBe(total)
    // Every winner saw a different number of places left: no two took the same place.
    expect(new Set(won.map((r) => r.placesLeft)).size).toBe(total)
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.reason === 'sold-out')).toBe(true)
  })

  it('keeps counters separate per club', async () => {
    const store = createMemoryPlacesStore()
    await claimPlace(store, 'a', 5)
    expect(store.taken('a')).toBe(1)
    expect(store.taken('b')).toBe(0)
  })

  it('gives a place back, never below zero, even under contention', async () => {
    const store = createMemoryPlacesStore({ delay: jitter })
    await Promise.all(Array.from({ length: 5 }, () => claimPlace(store, 'club', 10)))
    await Promise.all(Array.from({ length: 7 }, () => releasePlace(store, 'club')))
    expect(store.taken('club')).toBe(0)
  })

  it('works out places left', () => {
    expect(placesLeft(100, 37)).toBe(63)
    expect(placesLeft(100, 120)).toBe(0)
  })
})
