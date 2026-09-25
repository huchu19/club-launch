import { ArchImage } from '@/components/media/ArchImage'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import type { Cta, HeroBlockData } from '@/lib/content/types'

export type HeroBlockProps = Omit<HeroBlockData, '_type' | '_key'> & {
  /** The first hero on a page is the page's h1. */
  headingLevel?: 1 | 2
  id?: string
}

export function ctaHref(cta: Cta): string {
  if (cta.target === 'tour') return '#tour'
  if (cta.target === 'faq') return '#faq'
  return cta.url ?? '#'
}

export function HeroBlock({
  eyebrow,
  heading,
  subheading,
  image,
  primaryCta,
  headingLevel = 1,
  id = 'hero',
}: HeroBlockProps) {
  const headingId = `${id}-heading`
  return (
    <section aria-labelledby={headingId} className="overflow-hidden bg-canvas">
      <Container className="grid items-center gap-12 py-12 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-20">
        <div className="animate-rise">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Heading level={headingLevel} size="display" id={headingId}>
            {heading}
          </Heading>
          {subheading ? (
            <p className="mt-6 max-w-xl text-lg text-ink-muted md:text-xl">{subheading}</p>
          ) : null}
          {primaryCta ? (
            <div className="mt-10">
              <ButtonLink href={ctaHref(primaryCta)} size="lg">
                {primaryCta.label}
              </ButtonLink>
            </div>
          ) : null}
        </div>
        <ArchImage
          image={image}
          eager
          sizes="(min-width: 1152px) 520px, (min-width: 768px) 45vw, 90vw"
          className="mx-auto w-full max-w-md md:max-w-none"
        />
      </Container>
    </section>
  )
}
