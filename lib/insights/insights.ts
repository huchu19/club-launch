import type { Club, DayPlan, QuestionRecord } from '@/lib/content/types'
import { groupQuestions, type QuestionGroup } from './group'

// What visitors ask and plan, for club managers. Pure: the page loads the
// data, this shapes it, and tests cover the shaping.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Answers the FAQ assistant gave when it couldn't help. Real replies are worded
 * freely, so this looks for the shape of a refusal rather than exact text.
 */
const REFUSAL = /\b(can[’']?t|cannot|unable to|don[’']?t have)\b[^.]*\b(answer|help|information)\b/i
const PROFESSIONAL = /\b(gp|doctor|physio\w*|professional|medical)\b/i

export function isRefusal(answer: string): boolean {
  return REFUSAL.test(answer)
}

export type InsightQuestion = QuestionRecord & { refused: boolean }

export type ClubInsights = {
  totals: {
    timesAsked: number
    newThisWeek: number
    waitingForReview: number
    plansThisWeek: number
  }
  /** Every question except rejected ones, near-duplicates grouped, most asked first. */
  mostAsked: QuestionGroup<InsightQuestion>[]
  /** Questions without an approved answer yet, grouped. */
  needsAnswer: QuestionGroup<InsightQuestion>[]
  /** First asked in the last seven days, newest first. */
  newThisWeek: InsightQuestion[]
  planner: {
    plans: number
    chips: Array<{ label: string; count: number }>
    healthCaveats: number
    otherCaveats: number
    spaces: Array<{ spaceId: string; name: string; count: number }>
  }
}

const countBy = <T>(values: T[]) => {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}

export function buildInsights(
  questions: QuestionRecord[],
  plans: DayPlan[],
  club: Pick<Club, 'spaces'>,
  now: Date = new Date(),
): ClubInsights {
  const since = now.getTime() - WEEK_MS
  const recent = (iso?: string) => Boolean(iso) && Date.parse(iso!) >= since
  const all: InsightQuestion[] = questions
    .filter((q) => q.status !== 'rejected')
    .map((q) => ({ ...q, refused: q.source === 'ai' && isRefusal(q.answer) }))
  const waiting = all.filter((q) => q.status === 'pending')

  return {
    totals: {
      timesAsked: all.reduce((sum, q) => sum + q.askedCount, 0),
      newThisWeek: all.filter((q) => recent(q.createdAt)).length,
      waitingForReview: waiting.length,
      plansThisWeek: plans.filter((p) => recent(p.createdAt)).length,
    },
    mostAsked: groupQuestions(all).slice(0, 10),
    needsAnswer: groupQuestions(waiting),
    newThisWeek: all
      .filter((q) => recent(q.createdAt))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    planner: {
      plans: plans.length,
      chips: countBy(plans.flatMap((p) => p.chips)).map(([label, count]) => ({ label, count })),
      healthCaveats: plans.filter((p) => p.caveats.some((c) => PROFESSIONAL.test(c))).length,
      otherCaveats: plans.filter(
        (p) => p.caveats.length > 0 && !p.caveats.some((c) => PROFESSIONAL.test(c)),
      ).length,
      spaces: countBy(plans.flatMap((p) => [...new Set(p.stops.map((s) => s.spaceId))]))
        .slice(0, 5)
        .map(([spaceId, count]) => ({
          spaceId,
          name: club.spaces.find((s) => s.id === spaceId)?.name ?? spaceId,
          count,
        })),
    },
  }
}
