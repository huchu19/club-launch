import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { BusynessBlockData, OpeningHours, Space, Weekday } from '@/lib/content/types'
import { BusynessChart } from './BusynessChart'

export type BusynessBlockProps = Omit<BusynessBlockData, '_type' | '_key'> & {
  clubSlug: string
  spaces: Space[]
  openingHours: OpeningHours[]
  /** The club's current weekday, chosen on the server. */
  today: Weekday
  id?: string
}

/** Typical busyness by hour for each space. The data is illustrative (simulated). */
export function BusynessBlock({
  eyebrow,
  heading,
  intro,
  clubSlug,
  spaces,
  openingHours,
  today,
  id = 'busyness',
}: BusynessBlockProps) {
  if (spaces.length === 0) return null
  const headingId = `${id}-heading`
  return (
    <Section id={id} aria-labelledby={headingId} className="border-t border-line">
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading level={2} id={headingId}>
          {heading}
        </Heading>
        {intro ? <p className="mt-6 text-lg text-ink-muted">{intro}</p> : null}
      </div>
      <div className="mt-12">
        <BusynessChart
          clubSlug={clubSlug}
          spaces={spaces}
          openingHours={openingHours}
          today={today}
        />
      </div>
      <p className="mt-10 max-w-2xl text-sm text-ink-muted">
        Illustrative data: typical levels simulated for this demo, with morning and after-work peaks
        and busier weekend spa afternoons. A real club would use its gate-entry data.
      </p>
    </Section>
  )
}
