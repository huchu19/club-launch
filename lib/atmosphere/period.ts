import { dayPeriods, type HeroPeriodVariant } from '@/lib/content/types'
import { localMoment } from '@/lib/time/local-time'

// The club page's time of day, in the club's own time zone: morning 06–11,
// midday 11–16, evening 16–22, night 22–06.

export const periods = dayPeriods
export type Period = (typeof periods)[number]

export function periodOfHour(hour: number): Period {
  if (hour >= 6 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 16) return 'midday'
  if (hour >= 16 && hour < 22) return 'evening'
  return 'night'
}

export function periodAt(now: Date, timeZone: string): Period {
  return periodOfHour(localMoment(now, timeZone).hour)
}

/** Which part of the page the hero points to first at each time of day. */
export const periodHighlights: Record<Period, { section: string; label: string }> = {
  morning: { section: 'map', label: 'See this morning’s classes' },
  midday: { section: 'plan-your-day', label: 'Plan a lunchtime visit' },
  evening: { section: 'recovery', label: 'Spa and recovery this evening' },
  night: { section: 'plan-your-day', label: 'Plan tomorrow’s first day' },
}

export type HeroWording = { eyebrow?: string; subheading?: string; highlightLabel: string }

/** The hero's wording for a period: the editor's variant where set, otherwise the defaults. */
export function heroWording(
  base: { eyebrow?: string; subheading?: string },
  variants: HeroPeriodVariant[],
  period: Period,
): HeroWording {
  const variant = variants.find((v) => v.period === period)
  return {
    eyebrow: variant?.eyebrow || base.eyebrow,
    subheading: variant?.subheading || base.subheading,
    highlightLabel: variant?.highlightLabel || periodHighlights[period].label,
  }
}
