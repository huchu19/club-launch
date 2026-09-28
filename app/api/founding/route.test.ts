import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MARYLEBONE_ID } from '@/lib/content/demo-data'
import { demoRepository, resetDemoStore } from '@/lib/content/demo-repository'
import type { CrmAdapter } from '@/lib/crm'

let adapter: CrmAdapter
vi.mock('@/lib/crm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/crm')>()),
  getCrmAdapter: () => adapter,
}))

const { GET, POST } = await import('./route')

let ipCounter = 0
const post = (body: unknown, ip = `203.0.113.${++ipCounter % 250}`) =>
  POST(
    new NextRequest('http://localhost/api/founding', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  )
const status = (club: string) => GET(new NextRequest(`http://localhost/api/founding?club=${club}`))

const signup = (overrides: Record<string, unknown> = {}) => ({
  clubSlug: 'linden-marylebone',
  name: 'Sam Rivera',
  email: 'sam@example.com',
  consent: true,
  ...overrides,
})

/** Takes places directly, as earlier signups would have. */
async function takePlaces(n: number) {
  const { revision } = await demoRepository.foundingPlaces.read(MARYLEBONE_ID)
  await demoRepository.foundingPlaces.compareAndSet(MARYLEBONE_ID, revision, n)
}

beforeEach(() => {
  resetDemoStore()
  adapter = {
    name: 'test',
    submitLead: vi.fn(async () => ({ id: 'TOUR-TEST01' })),
    submitFoundingMember: vi.fn(async () => ({ id: 'FOUND-TEST01' })),
  }
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('/api/founding', () => {
  it('reports places left, uncached', async () => {
    const res = await status('linden-marylebone')
    expect(await res.json()).toEqual({ total: 150, placesLeft: 150 })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('takes a place and sends the signup to the CRM', async () => {
    const res = await post(signup())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reference: 'FOUND-TEST01', placesLeft: 149 })
    expect(adapter.submitFoundingMember).toHaveBeenCalledWith(
      expect.objectContaining({ clubSlug: 'linden-marylebone', email: 'sam@example.com' }),
    )
    expect(await (await status('linden-marylebone')).json()).toMatchObject({ placesLeft: 149 })
  })

  it('validates like the tour form and takes no place for invalid input', async () => {
    const res = await post(signup({ email: 'nope', consent: false }))
    expect(res.status).toBe(400)
    expect(Object.keys((await res.json()).fieldErrors).sort()).toEqual(['consent', 'email'])
    expect((await demoRepository.foundingPlaces.read(MARYLEBONE_ID)).taken).toBe(0)
  })

  it('drops honeypot submissions without taking a place', async () => {
    const res = await post(signup({ website: 'https://spam.example' }))
    expect(res.status).toBe(200)
    expect(adapter.submitFoundingMember).not.toHaveBeenCalled()
    expect((await demoRepository.foundingPlaces.read(MARYLEBONE_ID)).taken).toBe(0)
  })

  it('closes gracefully when the places have gone', async () => {
    await takePlaces(150)
    const res = await post(signup())
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ soldOut: true, placesLeft: 0 })
    expect(adapter.submitFoundingMember).not.toHaveBeenCalled()
  })

  it('gives the place back if the CRM fails twice', async () => {
    adapter.submitFoundingMember = vi.fn(async () => {
      throw new Error('CRM down')
    })
    const res = await post(signup())
    expect(res.status).toBe(502)
    expect(adapter.submitFoundingMember).toHaveBeenCalledTimes(2)
    expect((await demoRepository.foundingPlaces.read(MARYLEBONE_ID)).taken).toBe(0)
  })

  it('never oversells the last places when signups arrive together', async () => {
    await takePlaces(145)
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => post(signup(), `198.51.100.${i}`)),
    )
    const statuses = results.map((r) => r.status)
    expect(statuses.filter((s) => s === 200)).toHaveLength(5)
    expect(statuses.filter((s) => s === 409)).toHaveLength(7)
    expect((await demoRepository.foundingPlaces.read(MARYLEBONE_ID)).taken).toBe(150)
  })

  it('only open to clubs that are coming soon with a founding offer', async () => {
    expect((await post(signup({ clubSlug: 'linden-mayfair' }))).status).toBe(404)
    expect((await status('linden-mayfair')).status).toBe(404)
    expect((await status('../etc')).status).toBe(404)
  })

  it('limits each visitor to five requests per ten minutes', async () => {
    const ip = '192.0.2.99'
    for (let i = 0; i < 5; i++) await post(signup(), ip)
    const limited = await post(signup(), ip)
    expect(limited.status).toBe(429)
  })
})
