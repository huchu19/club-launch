import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoStore } from '@/lib/content/demo-repository'
import { FALLBACK_ANSWER } from '@/lib/faq/protocol'
import { POST } from './route'

let ipCounter = 0
function faqRequest(body: unknown, ip = `192.0.2.${++ipCounter}`) {
  return new NextRequest('http://localhost/api/faq', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  resetDemoStore()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('POST /api/faq (AI_MOCK=1, demo content)', () => {
  it('streams a new answer marked pending with its id', async () => {
    const res = await POST(
      faqRequest({ clubSlug: 'linden-mayfair', question: 'Is there a steam room?' }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('X-Faq-Status')).toBe('pending')
    expect(res.headers.get('X-Faq-Source')).toBe('model')
    expect(res.headers.get('X-Faq-Id')).toMatch(/^faq-ai-/)
    expect(await res.text()).toMatch(/steam room/)
  })

  it('serves an approved answer from the cache', async () => {
    const res = await POST(
      faqRequest({ clubSlug: 'linden-mayfair', question: 'can i bring a guest' }),
    )
    expect(res.headers.get('X-Faq-Status')).toBe('approved')
    expect(res.headers.get('X-Faq-Source')).toBe('cache')
    expect(res.headers.get('X-Faq-Id')).toBe('faq-mayfair-guests')
  })

  it('returns the fallback when the model quota is exhausted', async () => {
    const res = await POST(
      faqRequest({ clubSlug: 'linden-mayfair', question: 'quota: pool hours?' }),
    )
    expect(res.headers.get('X-Faq-Status')).toBe('fallback')
    expect(await res.text()).toBe(FALLBACK_ANSWER)
  })

  it('validates input', async () => {
    const tooLong = await POST(
      faqRequest({ clubSlug: 'linden-mayfair', question: 'x'.repeat(301) }),
    )
    expect(tooLong.status).toBe(400)
    expect((await tooLong.json()).error).toMatch(/300 characters or fewer/)
    const empty = await POST(faqRequest({ clubSlug: 'linden-mayfair', question: '   ' }))
    expect((await empty.json()).error).toBe('Enter your question')
    expect((await POST(faqRequest({ clubSlug: 'Bad Slug!', question: 'Hi' }))).status).toBe(400)
    expect((await POST(faqRequest({ clubSlug: 'nowhere', question: 'Hi' }))).status).toBe(404)
  })

  it('allows 10 questions per IP per 10 minutes', async () => {
    const ip = '198.51.100.99'
    for (let i = 0; i < 10; i++) {
      const res = await POST(
        faqRequest({ clubSlug: 'linden-mayfair', question: 'Can I bring a guest?' }, ip),
      )
      expect(res.status).toBe(200)
    }
    const blocked = await POST(faqRequest({ clubSlug: 'linden-mayfair', question: 'Hi' }, ip))
    expect(blocked.status).toBe(429)
  })
})
