import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { ConciergeBlockData } from '@/lib/content/types'
import { ConciergePlanner, type PlanDay } from './ConciergePlanner'

export type ConciergeBlockProps = Omit<ConciergeBlockData, '_type' | '_key'> & {
  clubSlug: string
  clubName: string
  locale?: string
  currency?: string
  /** Id of the page's tour booking section, when it has one. */
  tourSectionId?: string
  /** Override the transport (Storybook, tests). Defaults to POST /api/concierge. */
  plan?: PlanDay
  id?: string
}

export function ConciergeBlock({
  eyebrow,
  heading,
  intro,
  chips,
  clubSlug,
  clubName,
  locale,
  currency,
  tourSectionId,
  plan,
  id = 'plan-your-day',
}: ConciergeBlockProps) {
  const headingId = `${id}-heading`
  return (
    <Section id={id} aria-labelledby={headingId} className="border-t border-line">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Heading level={2} id={headingId}>
            {heading}
          </Heading>
          {intro ? <p className="mt-6 max-w-md text-lg text-ink-muted">{intro}</p> : null}
        </div>
        <Card elevation="raised">
          <ConciergePlanner
            clubSlug={clubSlug}
            clubName={clubName}
            chips={chips}
            locale={locale}
            currency={currency}
            tourSectionId={tourSectionId}
            plan={plan}
          />
        </Card>
      </div>
    </Section>
  )
}
