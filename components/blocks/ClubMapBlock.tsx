import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { Club, ClubMapBlockData } from '@/lib/content/types'
import { ClubMap } from './ClubMap'

export type ClubMapBlockProps = Omit<ClubMapBlockData, '_type' | '_key'> & {
  club: Pick<Club, 'name' | 'clubMap' | 'spaces' | 'schedule' | 'openingHours' | 'timeZone'>
  /** Id of the page's first-day planner, for "Add to my day". */
  plannerSectionId?: string
  /** Fix the clock (Storybook, tests). */
  now?: Date
  id?: string
}

/** An illustrative floor plan of the club. Renders nothing if the club has no plan yet. */
export function ClubMapBlock({
  eyebrow,
  heading,
  intro,
  club,
  plannerSectionId,
  now,
  id = 'map',
}: ClubMapBlockProps) {
  if (!club.clubMap?.floors.length) return null
  const headingId = `${id}-heading`
  return (
    <Section id={id} tone="raised" aria-labelledby={headingId}>
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading level={2} id={headingId}>
          {heading}
        </Heading>
        {intro ? <p className="mt-6 text-lg text-ink-muted">{intro}</p> : null}
      </div>
      <Card elevation="raised" className="mt-12">
        <ClubMap
          clubName={club.name}
          map={club.clubMap}
          spaces={club.spaces}
          schedule={club.schedule}
          openingHours={club.openingHours}
          timeZone={club.timeZone}
          plannerSectionId={plannerSectionId}
          now={now}
        />
      </Card>
    </Section>
  )
}
