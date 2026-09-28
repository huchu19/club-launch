import type { Club, DayPlan, PageBlock, RatePlan } from '@/lib/content/types'
import type { LeadDayPlan } from '@/lib/crm/adapter'
import type { DayPlanView } from './protocol'

/** Membership plans on a club page (from its rates block), for grounding and display. */
export function ratePlansOf(blocks: PageBlock[]): RatePlan[] {
  return blocks.flatMap((block) => (block._type === 'ratesBlock' ? block.plans : []))
}

/** Resolves space names and the recommended plan's price from the club's data. */
export function toDayPlanView(plan: DayPlan, club: Club, plans: RatePlan[]): DayPlanView {
  const recommended = plans.find(
    (p) => p.name.toLowerCase() === plan.recommendedPlanName?.trim().toLowerCase(),
  )
  return {
    id: plan.publicId,
    clubName: club.name,
    day: plan.day,
    summary: plan.summary,
    stops: plan.stops.map((stop) => ({
      time: stop.time,
      spaceId: stop.spaceId,
      spaceName: club.spaces.find((s) => s.id === stop.spaceId)?.name ?? stop.spaceId,
      ...(stop.className ? { className: stop.className } : {}),
      activity: stop.activity,
      reason: stop.reason,
    })),
    ...(recommended
      ? {
          recommendedPlan: {
            name: recommended.name,
            pricePerMonth: recommended.pricePerMonth,
            ...(recommended.joiningFee ? { joiningFee: recommended.joiningFee } : {}),
          },
        }
      : {}),
    caveats: plan.caveats,
  }
}

/** What the tour guide sees: the plan in plain terms, with space names resolved. */
export function toLeadDayPlan(plan: DayPlan, club: Club): LeadDayPlan {
  return {
    id: plan.publicId,
    day: plan.day,
    summary: plan.summary,
    stops: plan.stops.map((stop) => ({
      time: stop.time,
      space: club.spaces.find((s) => s.id === stop.spaceId)?.name ?? stop.spaceId,
      activity: stop.activity,
    })),
    ...(plan.recommendedPlanName ? { recommendedPlanName: plan.recommendedPlanName } : {}),
  }
}
