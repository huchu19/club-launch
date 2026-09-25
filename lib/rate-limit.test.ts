import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rate-limit'

describe('createRateLimiter', () => {
  it('allows up to the limit within the window, then blocks with a retry time', () => {
    let now = 0
    const limiter = createRateLimiter({ limit: 5, windowMs: 600_000, now: () => now })
    for (let i = 0; i < 5; i++) expect(limiter.check('ip').ok).toBe(true)
    now = 60_000
    expect(limiter.check('ip')).toEqual({ ok: false, retryAfterSeconds: 540 })
  })

  it('slides: a request becomes available once the oldest hit leaves the window', () => {
    let now = 0
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now })
    limiter.check('ip')
    now = 500
    limiter.check('ip')
    expect(limiter.check('ip').ok).toBe(false)
    now = 1000
    expect(limiter.check('ip')).toEqual({ ok: true, remaining: 0 })
  })

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
    expect(limiter.check('a').ok).toBe(true)
    expect(limiter.check('a').ok).toBe(false)
    expect(limiter.check('b').ok).toBe(true)
  })

  it('bounds memory by evicting the least recently used key', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0, maxKeys: 2 })
    limiter.check('a')
    limiter.check('b')
    limiter.check('c') // evicts "a"
    expect(limiter.check('a').ok).toBe(true)
  })
})
