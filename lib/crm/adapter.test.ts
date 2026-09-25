import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitLeadWithRetry, type CrmAdapter, type Lead } from './adapter'
import { MockCrmAdapter } from './mock'

const lead: Lead = {
  clubSlug: 'linden-mayfair',
  name: 'Sam Rivera',
  email: 'sam@example.com',
  phone: '020 7946 0000',
  preferredDate: '2026-10-01',
  timeSlot: 'morning',
  consentedAt: '2026-09-25T10:00:00.000Z',
}

function flakyAdapter(failures: number): CrmAdapter & { calls: number } {
  return {
    name: 'flaky',
    calls: 0,
    async submitLead() {
      this.calls += 1
      if (this.calls <= failures) throw new Error(`failure ${this.calls}`)
      return { id: 'LEAD-1' }
    },
  }
}

afterEach(() => vi.restoreAllMocks())

describe('submitLeadWithRetry', () => {
  it('returns the id on the first success without retrying', async () => {
    const adapter = flakyAdapter(0)
    await expect(submitLeadWithRetry(adapter, lead)).resolves.toEqual({ id: 'LEAD-1' })
    expect(adapter.calls).toBe(1)
  })

  it('retries exactly once after a failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const adapter = flakyAdapter(1)
    await expect(submitLeadWithRetry(adapter, lead)).resolves.toEqual({ id: 'LEAD-1' })
    expect(adapter.calls).toBe(2)
  })

  it('gives up after the retry fails and rethrows', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const adapter = flakyAdapter(5)
    await expect(submitLeadWithRetry(adapter, lead)).rejects.toThrow('failure 2')
    expect(adapter.calls).toBe(2)
  })
})

describe('MockCrmAdapter', () => {
  it('returns a reference and logs one line without personal data', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { id } = await new MockCrmAdapter().submitLead(lead)
    expect(id).toMatch(/^TOUR-[A-Z2-9]{6}$/)
    expect(info).toHaveBeenCalledOnce()
    const line = String(info.mock.calls[0]?.[0])
    expect(line).toContain('club=linden-mayfair')
    for (const secret of ['Sam', 'sam@example.com', '7946']) expect(line).not.toContain(secret)
  })

  it('validates the lead', async () => {
    await expect(new MockCrmAdapter().submitLead({ ...lead, email: 'nope' })).rejects.toThrow()
  })
})
