import type { Club, OpeningHours, RatePlan, Weekday } from '@/lib/content/types'
import type { PlanOutput } from './schema'

// Checks a plan against the club's real data. The schema can only say a time
// looks like "07:15"; this says whether the class is actually on at 07:15 that
// day, in that space, while the club is open. Each problem is written so it can
// be fed back to the model for its one retry.

const minutes = (time: string) => {
  const [h = '0', m = '0'] = time.split(':')
  return Number(h) * 60 + Number(m)
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function hoursOn(day: Weekday, hours: OpeningHours[]): OpeningHours | undefined {
  return hours.find((h) => h.day === day)
}

export function checkPlan(plan: PlanOutput, club: Club, plans: RatePlan[]): string[] {
  const problems: string[] = []
  const clubHours = hoursOn(plan.day, club.openingHours)
  if (!clubHours) return [`The club is closed on ${plan.day}. Choose another day.`]

  const spaceIds = club.spaces.map((s) => s.id).join(', ')
  let previous: { n: number; time: string } | undefined

  plan.stops.forEach((stop, index) => {
    const n = index + 1
    const label = `Stop ${n} (${stop.time})`

    if (previous && minutes(stop.time) <= minutes(previous.time)) {
      problems.push(`${label} must come after stop ${previous.n} (${previous.time}).`)
    }
    previous = { n, time: stop.time }

    const space = club.spaces.find((s) => s.id === stop.spaceId)
    if (!space) {
      problems.push(`${label}: "${stop.spaceId}" is not a space id. Use one of: ${spaceIds}.`)
      return
    }

    const hours = (space.openingHours.length && hoursOn(plan.day, space.openingHours)) || clubHours
    const at = minutes(stop.time)
    if (at < minutes(hours.opens) || at >= minutes(hours.closes)) {
      problems.push(
        `${label} is outside the hours of ${space.name} on ${plan.day} (${hours.opens}–${hours.closes}).`,
      )
    }

    const className = stop.className.trim()
    if (!className) return
    const slot = club.schedule.find(
      (entry) =>
        entry.day === plan.day &&
        same(entry.name, className) &&
        entry.time === stop.time &&
        entry.spaceId === stop.spaceId,
    )
    if (slot) return
    const onThatDay = club.schedule.filter(
      (entry) => entry.day === plan.day && same(entry.name, className),
    )
    problems.push(
      onThatDay.length
        ? `${label}: "${className}" is on ${plan.day} at ${onThatDay
            .map((entry) => `${entry.time} in ${entry.spaceId}`)
            .join(' and ')}, not at ${stop.time} in ${stop.spaceId}.`
        : `${label}: "${className}" is not on the schedule on ${plan.day}. Use a scheduled class or an empty className.`,
    )
  })

  if (plans.length && !plans.some((p) => same(p.name, plan.recommendedPlanName))) {
    problems.push(
      `"${plan.recommendedPlanName}" is not a membership plan. Use one of: ${plans
        .map((p) => p.name)
        .join(', ')}.`,
    )
  }

  return problems
}
