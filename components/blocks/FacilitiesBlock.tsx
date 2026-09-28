import { FacilityIcon, facilityCategoryLabels } from '@/components/media/FacilityIcon'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { Facility, FacilitiesBlockData } from '@/lib/content/types'

export type FacilitiesBlockProps = Omit<FacilitiesBlockData, '_type' | '_key'> & {
  /** The club's own facilities: the block never keeps a copy. */
  facilities: Facility[]
  id?: string
}

export function FacilitiesBlock({
  heading,
  intro,
  facilities,
  id = 'facilities',
}: FacilitiesBlockProps) {
  const headingId = `${id}-heading`
  return (
    <Section id={id} aria-labelledby={headingId}>
      <div className="grid gap-12 md:grid-cols-[1fr_1.5fr] md:gap-16">
        <div className="md:sticky md:top-8 md:self-start">
          <Heading level={2} id={headingId}>
            {heading}
          </Heading>
          {intro ? <p className="mt-6 max-w-md text-lg text-ink-muted">{intro}</p> : null}
        </div>
        {facilities.length > 0 ? (
          <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
            {facilities.map((facility) => (
              <li
                key={`${facility.category}-${facility.name}`}
                className="border-b border-line py-6"
              >
                <div className="flex items-center gap-3">
                  <FacilityIcon
                    category={facility.category}
                    className="size-6 shrink-0 text-brand"
                  />
                  <h3 className="font-sans text-lg font-medium tracking-normal">{facility.name}</h3>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {facilityCategoryLabels[facility.category]}
                </p>
                {facility.description ? (
                  <p className="mt-3 text-ink-muted">{facility.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-line py-6 text-ink-muted">
            The full list of facilities will be announced soon.
          </p>
        )}
      </div>
    </Section>
  )
}
