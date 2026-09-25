import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoStore } from '@/lib/content/demo-repository'
import { MOORGATE_ID } from '@/lib/content/demo-data'
import { POST } from './route'

const auth = `Basic ${Buffer.from('admin:secret').toString('base64')}`

function draftRequest(body: unknown, authorization: string | null = auth) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (authorization) headers.authorization = authorization
  return new NextRequest('http://localhost/api/admin/draft', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  resetDemoStore()
  vi.stubEnv('ADMIN_USER', 'admin')
  vi.stubEnv('ADMIN_PASSWORD', 'secret')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const valid = {
  clubId: MOORGATE_ID,
  brief: 'Announce the conversion; lead with recovery.',
  tone: 'calm',
}

describe('POST /api/admin/draft', () => {
  it('requires basic auth even if the proxy is bypassed', async () => {
    const res = await POST(draftRequest(valid, null))
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toMatch(/^Basic/)
  })

  it('creates a draft and returns placeholders and a Studio link', async () => {
    const res = await POST(draftRequest(valid))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.draftId).toMatch(/^drafts\./)
    expect(body.studioPath).toMatch(/^\/studio\/intent\/edit\/id=/)
    expect(body.placeholders.length).toBeGreaterThan(0)
  })

  it('validates the brief and tone', async () => {
    const short = await POST(draftRequest({ ...valid, brief: 'short' }))
    expect(short.status).toBe(400)
    expect((await short.json()).error).toBe('Write a brief of at least 20 characters')
    const tone = await POST(draftRequest({ ...valid, tone: 'loud' }))
    expect((await tone.json()).error).toBe('Choose a tone')
  })

  it('returns 409 for a club that already has a page and 404 for an unknown one', async () => {
    expect((await POST(draftRequest({ ...valid, clubId: 'club-linden-mayfair' }))).status).toBe(409)
    expect((await POST(draftRequest({ ...valid, clubId: 'club-nope' }))).status).toBe(404)
  })
})
