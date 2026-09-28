import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DayPlanDetails } from '@/components/blocks/DayPlanDetails'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import { loadSharedPlan } from '@/lib/concierge/shared-plan'
import { clubPath } from '@/lib/content/types'

type Params = { market: string; slug: string; dayPlanId: string }
type Props = { params: Promise<Params> }

// Shared plans are personal and endless in number: never indexed.
const robots = { index: false, follow: false }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, slug, dayPlanId } = await params
  const shared = await loadSharedPlan(market, slug, dayPlanId)
  if (!shared) return { title: 'Plan not found', robots }
  const title = `A ${shared.day.day} at ${shared.day.clubName}`
  return {
    title: { absolute: title },
    description: shared.day.summary,
    robots,
    openGraph: { type: 'website', title, description: shared.day.summary },
    twitter: { card: 'summary_large_image', title, description: shared.day.summary },
  }
}

/** A read-only view of a planned first day: the structured plan only, never the visitor's words. */
export default async function SharedDayPage({ params }: Props) {
  const { market, slug, dayPlanId } = await params
  const shared = await loadSharedPlan(market, slug, dayPlanId)
  if (!shared) notFound()
  const { page, day } = shared
  const path = clubPath(page.club.market.code, page.club.slug)

  return (
    <Section aria-labelledby="shared-day-heading">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <Eyebrow>A planned first day</Eyebrow>
          <Heading level={1} size="xl" id="shared-day-heading">
            A {day.day} at {day.clubName}
          </Heading>
          <p className="mt-6 text-lg text-ink-muted">{day.summary}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={`${path}#tour`} size="lg">
              Book your own tour
            </ButtonLink>
            <ButtonLink href={`${path}#plan-your-day`} variant="secondary" size="lg">
              Plan your own day
            </ButtonLink>
          </div>
          <p className="mt-8 max-w-md text-sm text-ink-muted">
            Planned with the club’s first-day planner and suggested automatically from its
            timetable, which can change.
          </p>
        </div>
        <Card elevation="raised" className="space-y-8">
          <DayPlanDetails
            day={day}
            locale={page.club.market.locale}
            currency={page.club.market.currency}
            listLabel={`A ${day.day}, stop by stop`}
          />
        </Card>
      </div>
    </Section>
  )
}
