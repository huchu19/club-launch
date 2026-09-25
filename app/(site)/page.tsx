import type { Metadata } from 'next'
import { ClubCard } from '@/components/site/ClubCard'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import { getContentRepository } from '@/lib/content'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: { absolute: `${site.name} — launch social wellness club pages` },
  description: site.description,
  alternates: { canonical: '/' },
}

const principles = [
  {
    title: 'Blocks, not builds',
    body: 'Every section of a club page is a tested component with its own story. Editors arrange blocks in the studio; the layout can’t break.',
  },
  {
    title: 'AI drafts, people publish',
    body: 'The page drafter writes a first version from the club’s facts only, and leaves a [[placeholder]] for every price or date it doesn’t know. Pages can’t be published until each one is replaced.',
  },
  {
    title: 'Questions that answer themselves',
    body: 'Visitors ask anything; answers are grounded in the club’s own facts and wait for an editor’s approval before anyone else sees them.',
  },
]

export default async function HomePage() {
  const clubs = await getContentRepository().listClubPages()

  return (
    <>
      <Container className="py-section">
        <div className="max-w-3xl animate-rise">
          <Eyebrow>{site.name}</Eyebrow>
          <Heading level={1}>Launch a club page in an afternoon.</Heading>
          <p className="mt-6 text-lg text-ink-muted md:text-xl">
            Premium gyms are becoming social wellness clubs, one site at a time. {site.name} lets a
            non-engineer launch each club’s page from pre-built blocks, with two AI helpers that
            always leave an editor in control.
          </p>
        </div>
      </Container>

      <Section id="clubs" tone="raised" aria-labelledby="clubs-heading">
        <Heading level={2} id="clubs-heading">
          Clubs
        </Heading>
        {clubs.length > 0 ? (
          <ul className="mt-12 grid gap-x-10 gap-y-16 md:grid-cols-2">
            {clubs.map((club) => (
              <li key={`${club.market}-${club.slug}`}>
                <ClubCard club={club} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-ink-muted">No club pages have been published yet.</p>
        )}
      </Section>

      <Section aria-labelledby="how-heading">
        <Heading level={2} id="how-heading">
          How it works
        </Heading>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {principles.map((item, index) => (
            <li key={item.title} className="border-t border-line pt-6">
              <p className="font-display text-sm text-brand" aria-hidden="true">
                0{index + 1}
              </p>
              <h3 className="mt-3 text-2xl">{item.title}</h3>
              <p className="mt-3 text-ink-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  )
}
