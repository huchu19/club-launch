import { beforeEach, describe, expect, it } from 'vitest'
import { MAYFAIR_ID, MOORGATE_ID } from '@/lib/content/demo-data'
import { demoRepository, resetDemoStore } from '@/lib/content/demo-repository'
import type { DayPlan } from '@/lib/content/types'
import { loadSharedPlan } from './shared-plan'

const plan = (overrides: Partial<DayPlan> = {}): DayPlan => ({
  publicId: 'shareplan0000001',
  clubId: MAYFAIR_ID,
  day: 'Saturday',
  summary: 'A purposeful Saturday.',
  stops: [
    {
      time: '08:00',
      spaceId: 'strength-studio',
      className: 'Weekend strength',
      activity: 'Weekend strength',
      reason: 'You start strong.',
    },
  ],
  recommendedPlanName: 'Club',
  caveats: [],
  chips: [],
  ...overrides,
})

beforeEach(() => resetDemoStore())

describe('loadSharedPlan', () => {
  it('returns the plan with space names and the plan price resolved', async () => {
    await demoRepository.createDayPlan(plan())
    const shared = await loadSharedPlan('uk', 'linden-mayfair', 'shareplan0000001')
    expect(shared?.day).toMatchObject({
      clubName: 'Linden Mayfair',
      day: 'Saturday',
      stops: [{ spaceName: 'Strength studio' }],
      recommendedPlan: { name: 'Club', pricePerMonth: '245' },
    })
  })

  it('refuses malformed ids without looking them up', async () => {
    expect(await loadSharedPlan('uk', 'linden-mayfair', '../../etc')).toBeNull()
    expect(await loadSharedPlan('uk', 'linden-mayfair', 'SHOUTY00000000')).toBeNull()
  })

  it('refuses a plan shown under another club’s URL, or an unknown plan', async () => {
    await demoRepository.createDayPlan(plan({ clubId: MOORGATE_ID }))
    expect(await loadSharedPlan('uk', 'linden-mayfair', 'shareplan0000001')).toBeNull()
    expect(await loadSharedPlan('uk', 'linden-mayfair', 'nosuchplan000000')).toBeNull()
  })
})
