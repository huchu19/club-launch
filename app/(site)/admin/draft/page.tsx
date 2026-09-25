import type { Metadata } from 'next'
import { DraftForm } from '@/components/admin/DraftForm'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { getContentRepository } from '@/lib/content'

// Behind basic auth (proxy.ts); always fresh so newly drafted clubs drop off the list.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI page drafter',
  robots: { index: false, follow: false },
}

export default async function DraftPage() {
  const clubs = await getContentRepository().listClubsWithoutPage()
  return (
    <Container className="grid gap-12 py-section lg:grid-cols-[1fr_1.4fr] lg:gap-16">
      <div>
        <Eyebrow>Admin</Eyebrow>
        <Heading level={1} size="xl">
          Draft a club page
        </Heading>
        <p className="mt-6 text-lg text-ink-muted">
          Give the drafter a brief and it writes a first version of the page from the club’s own
          facts.
        </p>
        <ul className="mt-8 space-y-3 border-t border-line pt-6 text-ink-muted">
          <li>It creates an unpublished draft in the studio. It never publishes.</li>
          <li>
            Prices, dates and numbers it doesn’t know become <code>[[placeholders]]</code>, and the
            page can’t be published until every one is replaced.
          </li>
          <li>It never invents awards, statistics or staff.</li>
        </ul>
      </div>
      <div>
        <DraftForm clubs={clubs} />
      </div>
    </Container>
  )
}
