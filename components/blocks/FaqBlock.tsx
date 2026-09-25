import { Accordion } from '@/components/ui/Accordion'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { FaqBlockData, PublicFaq } from '@/lib/content/types'
import { FaqQuestions, type AskFaq } from './FaqQuestions'

export type FaqBlockProps = Omit<FaqBlockData, '_type' | '_key'> & {
  /** Approved FAQ items for this club. */
  faqs: PublicFaq[]
  clubSlug: string
  /** Override the transport (Storybook, tests). Defaults to POST /api/faq. */
  ask?: AskFaq
  id?: string
}

export function FaqBlock({
  heading,
  intro,
  allowQuestions,
  faqs,
  clubSlug,
  ask,
  id = 'faq',
}: FaqBlockProps) {
  const headingId = `${id}-heading`
  return (
    <Section id={id} aria-labelledby={headingId}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <Heading level={2} id={headingId}>
            {heading}
          </Heading>
          {intro ? <p className="mt-6 max-w-md text-lg text-ink-muted">{intro}</p> : null}
        </div>
        <div>
          {allowQuestions ? (
            <FaqQuestions clubSlug={clubSlug} faqs={faqs} ask={ask} />
          ) : faqs.length > 0 ? (
            <Accordion
              items={faqs.map((faq) => ({
                id: faq._id,
                title: faq.question,
                content: <p>{faq.answer}</p>,
              }))}
            />
          ) : (
            <p className="border-y border-line py-6 text-ink-muted">
              No questions have been answered yet.
            </p>
          )}
        </div>
      </div>
    </Section>
  )
}
