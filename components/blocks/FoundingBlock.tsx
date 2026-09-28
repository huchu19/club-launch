import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { FoundingBlockData } from '@/lib/content/types'
import { formatPrice } from '@/lib/format'
import { FoundingSignup, type FetchPlacesLeft, type SubmitFounding } from './FoundingSignup'

export type FoundingBlockProps = Omit<FoundingBlockData, '_type' | '_key'> & {
  clubSlug: string
  clubName: string
  placesLeft: number
  locale?: string
  currency?: string
  tourHref?: string
  /** Override the transports (Storybook, tests). */
  submit?: SubmitFounding
  loadPlacesLeft?: FetchPlacesLeft
  id?: string
}

/** Founding member pre-sale with a live count of places left. */
export function FoundingBlock({
  eyebrow,
  heading,
  offer,
  pricePerMonth,
  joiningFee,
  totalPlaces,
  clubSlug,
  clubName,
  placesLeft,
  locale,
  currency,
  tourHref,
  submit,
  loadPlacesLeft,
  id = 'founding',
}: FoundingBlockProps) {
  const headingId = `${id}-heading`
  const fee = Number(joiningFee)
  return (
    <Section id={id} tone="raised" aria-labelledby={headingId}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
        <div>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Heading level={2} id={headingId}>
            {heading}
          </Heading>
          <p className="mt-6 max-w-md text-lg text-ink-muted">{offer}</p>
          <p className="mt-8 flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-5xl tracking-tight text-ink">
              {formatPrice(pricePerMonth, locale, currency)}
            </span>
            <span className="text-ink-muted">per month</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {fee > 0
              ? `Joining fee ${formatPrice(joiningFee, locale, currency)}`
              : 'No joining fee for founding members'}
          </p>
        </div>
        <Card elevation="raised">
          <FoundingSignup
            clubSlug={clubSlug}
            clubName={clubName}
            totalPlaces={totalPlaces}
            initialPlacesLeft={placesLeft}
            tourHref={tourHref}
            submit={submit}
            loadPlacesLeft={loadPlacesLeft}
          />
        </Card>
      </div>
    </Section>
  )
}
