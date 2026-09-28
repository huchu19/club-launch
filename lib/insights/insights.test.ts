import { describe, expect, it } from 'vitest'
import { demoClubs } from '@/lib/content/demo-data'
import type { DayPlan, QuestionRecord } from '@/lib/content/types'
import { refusalText } from '@/lib/faq/prompt'
import { buildInsights, isRefusal } from './insights'

const mayfair = demoClubs[0]!
const now = new Date('2026-09-28T12:00:00Z')
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString()

const question = (overrides: Partial<QuestionRecord>): QuestionRecord => ({
  _id: `q-${Math.random()}`,
  question: 'Is there parking?',
  answer: 'There is no on-site parking.',
  status: 'approved',
  source: 'editor',
  askedCount: 1,
  createdAt: daysAgo(30),
  ...overrides,
})

const plan = (overrides: Partial<DayPlan>): DayPlan => ({
  publicId: 'plan000000000001',
  clubId: mayfair._id,
  day: 'Wednesday',
  summary: 'A day.',
  stops: [{ time: '08:00', spaceId: 'pool', activity: 'Swim', reason: 'You swim.' }],
  caveats: [],
  chips: [],
  createdAt: daysAgo(1),
  ...overrides,
})

describe('isRefusal', () => {
  it('recognises the assistant declining, however it is worded', () => {
    expect(isRefusal(refusalText('Linden Mayfair'))).toBe(true)
    expect(isRefusal('Sorry, I don’t have that information. Please ask the team.')).toBe(true)
    expect(isRefusal('I am unable to help with medical questions.')).toBe(true)
    expect(isRefusal('Yes, the thermal suite has a steam room.')).toBe(false)
  })
})

describe('buildInsights', () => {
  const questions = [
    question({ question: 'Is there parking at the club?', askedCount: 14 }),
    question({
      question: 'Where can I park?',
      status: 'pending',
      source: 'ai',
      askedCount: 3,
      createdAt: daysAgo(2),
    }),
    question({
      question: 'How warm is the pool?',
      answer: refusalText('Linden Mayfair'),
      status: 'pending',
      source: 'ai',
      askedCount: 2,
      createdAt: daysAgo(3),
    }),
    question({
      question: 'Can I bring my dog?',
      status: 'rejected',
      source: 'ai',
      askedCount: 5,
      createdAt: daysAgo(1),
    }),
  ]
  const plans = [
    plan({
      chips: ['I work from home'],
      stops: [
        { time: '10:00', spaceId: 'workspace', activity: 'Work', reason: 'r' },
        { time: '13:00', spaceId: 'garden-kitchen', activity: 'Lunch', reason: 'r' },
      ],
    }),
    plan({ chips: ['I work from home', 'I need to unwind'], caveats: ['Check with a GP first.'] }),
    plan({ chips: ['I need to unwind'], caveats: ['Classes can change.'], createdAt: daysAgo(20) }),
  ]
  const insights = buildInsights(questions, plans, mayfair, now)

  it('totals questions and plans, leaving out rejected questions', () => {
    expect(insights.totals).toEqual({
      timesAsked: 19,
      newThisWeek: 2,
      waitingForReview: 2,
      plansThisWeek: 2,
    })
  })

  it('groups the most-asked questions and what still needs an answer', () => {
    expect(insights.mostAsked.map((g) => [g.lead.question, g.totalAsked])).toEqual([
      ['Is there parking at the club?', 17],
      ['How warm is the pool?', 2],
    ])
    expect(insights.needsAnswer.map((g) => [g.lead.question, g.lead.refused])).toEqual([
      ['Where can I park?', false],
      ['How warm is the pool?', true],
    ])
  })

  it('lists this week’s new questions, newest first', () => {
    expect(insights.newThisWeek.map((q) => q.question)).toEqual([
      'Where can I park?',
      'How warm is the pool?',
    ])
  })

  it('counts planner themes: chips, caveat types and spaces', () => {
    expect(insights.planner.chips).toEqual([
      { label: 'I work from home', count: 2 },
      { label: 'I need to unwind', count: 2 },
    ])
    expect(insights.planner.healthCaveats).toBe(1)
    expect(insights.planner.otherCaveats).toBe(1)
    expect(insights.planner.spaces[0]).toEqual({ spaceId: 'pool', name: '20-metre pool', count: 2 })
  })

  it('copes with a club nobody has asked about yet', () => {
    const empty = buildInsights([], [], mayfair, now)
    expect(empty.totals).toEqual({
      timesAsked: 0,
      newThisWeek: 0,
      waitingForReview: 0,
      plansThisWeek: 0,
    })
    expect(empty.mostAsked).toEqual([])
  })
})
