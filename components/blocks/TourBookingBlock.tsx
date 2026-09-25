import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { TourBookingBlockData } from '@/lib/content/types'
import type { OpeningRange } from '@/lib/format'
import { TourForm, type SubmitTour } from './TourForm'

export type TourClubDetails = {
  name: string
  slug: string
  address?: string
  phone?: string
  openingHours?: OpeningRange[]
}

export type TourBookingBlockProps = Omit<TourBookingBlockData, '_type' | '_key'> & {
  club: TourClubDetails
  /** Override the transport (Storybook, tests). Defaults to POST /api/tour. */
  submit?: SubmitTour
  id?: string
}

export function TourBookingBlock({
  heading,
  intro,
  club,
  submit,
  id = 'tour',
}: TourBookingBlockProps) {
  const headingId = `${id}-heading`
  return (
    <Section id={id} tone="raised" aria-labelledby={headingId}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
        <div>
          <Eyebrow>Book a tour</Eyebrow>
          <Heading level={2} id={headingId}>
            {heading}
          </Heading>
          {intro ? <p className="mt-6 max-w-md text-lg text-ink-muted">{intro}</p> : null}
          {club.address || club.phone || club.openingHours?.length ? (
            <dl className="mt-10 space-y-6 border-t border-line pt-8">
              {club.address ? (
                <div>
                  <dt className="text-sm font-medium text-ink-muted">Address</dt>
                  <dd className="mt-1">{club.address}</dd>
                </div>
              ) : null}
              {club.phone ? (
                <div>
                  <dt className="text-sm font-medium text-ink-muted">Phone</dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${club.phone.replace(/\s+/g, '')}`}
                      className="underline decoration-1 underline-offset-4 hover:decoration-2"
                    >
                      {club.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {club.openingHours?.length ? (
                <div>
                  <dt className="text-sm font-medium text-ink-muted">Opening hours</dt>
                  <dd className="mt-1">
                    <ul>
                      {club.openingHours.map((range) => (
                        <li key={range.days} className="flex flex-wrap justify-between gap-x-6">
                          <span>{range.days}</span>
                          <span className="tabular-nums">{range.hours}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        <Card elevation="raised">
          <TourForm clubSlug={club.slug} clubName={club.name} submit={submit} />
        </Card>
      </div>
    </Section>
  )
}
