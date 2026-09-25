import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CrmAdapter } from '@/lib/crm'
import { addDaysIso, todayIso } from '@/lib/tour/schema'

// Swap the CRM adapter per test; everything else (demo content, schema) is real.
let adapter: CrmAdapter
vi.mock('@/lib/crm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/crm')>()),
  getCrmAdapter: () => adapter,
}))

const { POST } = await import('./route')

let ipCounter = 0
function tourRequest(body: unknown, ip = `203.0.113.${++ipCounter}`) {
  return new NextRequest('http://localhost/api/tour', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = () => ({
  clubSlug: 'linden-mayfair',
  name: 'Sam Rivera',
  email: 'sam@example.com',
  preferredDate: addDaysIso(todayIso(), 3),
  timeSlot: 'evening',
  consent: true,
})

beforeEach(() => {
  adapter = { name: 'test', submitLead: vi.fn(async () => ({ id: 'TOUR-TEST01' })) }
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('POST /api/tour', () => {
  it('submits a valid request to the CRM and returns its reference', async () => {
    const res = await POST(tourRequest(valid()))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reference: 'TOUR-TEST01' })
    expect(adapter.submitLead).toHaveBeenCalledWith(
      expect.objectContaining({
        clubSlug: 'linden-mayfair',
        email: 'sam@example.com',
        timeSlot: 'evening',
      }),
    )
  })

  it('returns field errors for invalid input and does not call the CRM', async () => {
    const res = await POST(tourRequest({ ...valid(), email: 'nope', consent: false }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(Object.keys(body.fieldErrors).sort()).toEqual(['consent', 'email'])
    expect(adapter.submitLead).not.toHaveBeenCalled()
  })

  it('rejects non-JSON and oversized bodies', async () => {
    expect((await POST(tourRequest('not json'))).status).toBe(400)
    expect((await POST(tourRequest({ ...valid(), name: 'x'.repeat(20_000) }))).status).toBe(413)
  })

  it('drops honeypot submissions silently', async () => {
    const res = await POST(tourRequest({ ...valid(), website: 'https://spam.example' }))
    expect(res.status).toBe(200)
    expect((await res.json()).reference).toMatch(/^TOUR-/)
    expect(adapter.submitLead).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown club', async () => {
    const res = await POST(tourRequest({ ...valid(), clubSlug: 'no-such-club' }))
    expect(res.status).toBe(404)
  })

  it('retries a failing CRM once, then returns a friendly error', async () => {
    adapter.submitLead = vi.fn(async () => {
      throw new Error('CRM down')
    })
    const res = await POST(tourRequest(valid()))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/details are still here/)
    expect(adapter.submitLead).toHaveBeenCalledTimes(2)
  })

  it('allows 5 requests per IP per 10 minutes, then responds 429 with Retry-After', async () => {
    const ip = '198.51.100.7'
    for (let i = 0; i < 5; i++) expect((await POST(tourRequest(valid(), ip))).status).toBe(200)
    const blocked = await POST(tourRequest(valid(), ip))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await POST(tourRequest(valid(), '198.51.100.8'))).status).toBe(200)
  })
})
