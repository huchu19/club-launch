import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }))

const SECRET = 'test-webhook-secret'

async function signedRequest(payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload)
  const signature = await encodeSignatureHeader(body, Date.now(), secret)
  return new NextRequest('http://localhost/api/revalidate', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', [SIGNATURE_HEADER_NAME]: signature },
  })
}

/**
 * parseBody waits 3 s for Content Lake consistency, after real async crypto.
 * Step a fake setTimeout clock (yielding real macrotasks) until it settles.
 */
async function post(request: NextRequest) {
  const { POST } = await import('./route')
  let settled = false
  const pending = POST(request).finally(() => {
    settled = true
  })
  while (!settled) {
    await new Promise((resolve) => setImmediate(resolve))
    await vi.advanceTimersByTimeAsync(1000)
  }
  return pending
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    revalidateTag.mockReset()
    vi.stubEnv('SANITY_REVALIDATE_SECRET', SECRET)
    vi.useFakeTimers({ toFake: ['setTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('expires tags for a correctly signed webhook', async () => {
    const res = await post(await signedRequest({ _type: 'clubPage', clubSlug: 'linden-mayfair' }))
    expect(res.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('clubPage', { expire: 0 })
    expect(revalidateTag).toHaveBeenCalledWith('club:linden-mayfair', { expire: 0 })
  })

  it('rejects a bad signature without revalidating', async () => {
    const res = await post(await signedRequest({ _type: 'clubPage' }, 'wrong-secret'))
    expect(res.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects an unexpected payload', async () => {
    const res = await post(await signedRequest({ hello: 'world' }))
    expect(res.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('refuses to run without a configured secret', async () => {
    vi.stubEnv('SANITY_REVALIDATE_SECRET', '')
    const res = await post(await signedRequest({ _type: 'club' }))
    expect(res.status).toBe(503)
  })
})
