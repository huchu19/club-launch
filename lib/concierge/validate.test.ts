import { describe, expect, it } from 'vitest'
import { demoClubs, demoPages } from '@/lib/content/demo-data'
import type { PlanOutput } from './schema'
import { checkPlan } from './validate'
import { ratePlansOf } from '@/lib/content/rate-plans'

const mayfair = demoClubs[0]!
const plans = ratePlansOf(demoPages[0]!.blocks)

const stop = (overrides: Partial<PlanOutput['stops'][number]> = {}) => ({
  time: '10:00',
  spaceId: 'pool',
  className: '',
  activity: 'An easy swim',
  reason: 'You loosen off.',
  ...overrides,
})

const validPlan = (): PlanOutput => ({
  offTopic: false,
  day: 'Wednesday',
  summary: 'A balanced Wednesday.',
  stops: [
    stop({ time: '08:00', spaceId: 'movement-studio', className: 'Vinyasa yoga' }),
    stop({ time: '10:00', spaceId: 'workspace' }),
    stop({ time: '13:00', spaceId: 'garden-kitchen' }),
    stop({ time: '17:30', spaceId: 'contrast-therapy', className: 'Guided contrast circuit' }),
    stop({ time: '18:30', spaceId: 'thermal-suite' }),
  ],
  recommendedPlanName: 'Club and workspace',
  caveats: [],
})

describe('checkPlan', () => {
  it('accepts a plan that fits the real spaces, hours and timetable', () => {
    expect(checkPlan(validPlan(), mayfair, plans)).toEqual([])
  })

  it('matches class and plan names without regard to case or spacing', () => {
    const plan = validPlan()
    plan.stops[0] = { ...plan.stops[0]!, className: ' vinyasa YOGA ' }
    plan.recommendedPlanName = 'club and workspace'
    expect(checkPlan(plan, mayfair, plans)).toEqual([])
  })

  it('rejects a space the club does not have, naming the valid ids', () => {
    const plan = validPlan()
    plan.stops[1] = stop({ time: '10:00', spaceId: 'rooftop-bar' })
    const [problem] = checkPlan(plan, mayfair, plans)
    expect(problem).toContain('"rooftop-bar" is not a space id')
    expect(problem).toContain('thermal-suite')
  })

  it('rejects stops outside the club’s hours', () => {
    const plan = validPlan()
    plan.stops[0] = stop({ time: '05:30', spaceId: 'pool' })
    expect(checkPlan(plan, mayfair, plans)).toEqual([
      'Stop 1 (05:30) is outside the hours of 20-metre pool on Wednesday (06:00–22:30).',
    ])
  })

  it('uses a space’s own hours when it has them', () => {
    const plan = validPlan()
    // The workspace closes at 20:00 on weekdays, earlier than the club.
    plan.stops[4] = stop({ time: '20:30', spaceId: 'workspace' })
    expect(checkPlan(plan, mayfair, plans)).toEqual([
      "Stop 5 (20:30) is outside the hours of Members' workspace on Wednesday (07:00–20:00).",
    ])
  })

  it('rejects a class that is not on at that time, and says when it is on', () => {
    const plan = validPlan()
    plan.stops[0] = stop({ time: '09:00', spaceId: 'movement-studio', className: 'Vinyasa yoga' })
    expect(checkPlan(plan, mayfair, plans)).toEqual([
      'Stop 1 (09:00): "Vinyasa yoga" is on Wednesday at 08:00 in movement-studio, not at 09:00 in movement-studio.',
    ])
  })

  it('rejects a class in the wrong space', () => {
    const plan = validPlan()
    plan.stops[0] = stop({ time: '08:00', spaceId: 'pool', className: 'Vinyasa yoga' })
    expect(checkPlan(plan, mayfair, plans)[0]).toContain('not at 08:00 in pool')
  })

  it('rejects a class that is not on the schedule that day', () => {
    const plan = validPlan()
    // Mat Pilates runs on Tuesdays and Thursdays, not Wednesdays.
    plan.stops[0] = stop({ time: '08:00', spaceId: 'movement-studio', className: 'Mat Pilates' })
    expect(checkPlan(plan, mayfair, plans)[0]).toContain(
      '"Mat Pilates" is not on the schedule on Wednesday',
    )
  })

  it('rejects stops that are out of time order', () => {
    const plan = validPlan()
    plan.stops[2] = stop({ time: '09:30', spaceId: 'garden-kitchen' })
    expect(checkPlan(plan, mayfair, plans)).toEqual([
      'Stop 3 (09:30) must come after stop 2 (10:00).',
    ])
  })

  it('rejects a membership plan that does not exist', () => {
    const plan = validPlan()
    plan.recommendedPlanName = 'Platinum'
    expect(checkPlan(plan, mayfair, plans)).toEqual([
      '"Platinum" is not a membership plan. Use one of: Club, Club and workspace, Off-peak.',
    ])
  })

  it('reports a closed day on its own', () => {
    const club = {
      ...mayfair,
      openingHours: mayfair.openingHours.filter((h) => h.day !== 'Sunday'),
    }
    expect(checkPlan({ ...validPlan(), day: 'Sunday' }, club, plans)).toEqual([
      'The club is closed on Sunday. Choose another day.',
    ])
  })
})
