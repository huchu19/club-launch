import { ArchImage } from '@/components/media/ArchImage'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { TextLink } from '@/components/ui/TextLink'
import { heroWording, type Period } from '@/lib/atmosphere/period'
import { cn } from '@/lib/cn'
import type { Cta, HeroBlockData } from '@/lib/content/types'

export type HeroBlockProps = Omit<HeroBlockData, '_type' | '_key' | 'periodVariants'> & {
  periodVariants?: HeroBlockData['periodVariants']
  /** The club's time of day, chosen on the server; without it the hero is untinted. */
  period?: Period
  /** In-page section to point to at this time of day, when the page has it. */
  highlightHref?: string
  /** The first hero on a page is the page's h1. */
  headingLevel?: 1 | 2
  id?: string
}

// A soft wash from the top of the hero into the page colour, per time of day.
const tints: Record<Period, string> = {
  morning: 'bg-[linear-gradient(180deg,var(--color-tint-morning)_0%,var(--color-canvas)_85%)]',
  midday: 'bg-[linear-gradient(180deg,var(--color-tint-midday)_0%,var(--color-canvas)_85%)]',
  evening: 'bg-[linear-gradient(180deg,var(--color-tint-evening)_0%,var(--color-canvas)_85%)]',
  night: 'bg-[linear-gradient(180deg,var(--color-tint-night)_0%,var(--color-canvas)_85%)]',
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
  periodVariants = [],
  period,
  highlightHref,
  headingLevel = 1,
  id = 'hero',
}: HeroBlockProps) {
  const headingId = `${id}-heading`
  const wording = period
    ? heroWording({ eyebrow, subheading }, periodVariants, period)
    : { eyebrow, subheading, highlightLabel: undefined }
  return (
    <section
      aria-labelledby={headingId}
      data-period={period}
      className={cn('overflow-hidden bg-canvas', period && tints[period])}
    >
      <Container className="grid items-center gap-12 py-12 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-20">
        <div className="animate-rise">
          {wording.eyebrow ? <Eyebrow>{wording.eyebrow}</Eyebrow> : null}
          <Heading level={headingLevel} size="display" id={headingId}>
            {heading}
          </Heading>
          {wording.subheading ? (
            <p className="mt-6 max-w-xl text-lg text-ink-muted md:text-xl">{wording.subheading}</p>
          ) : null}
          {primaryCta || (highlightHref && wording.highlightLabel) ? (
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
              {primaryCta ? (
                <ButtonLink href={ctaHref(primaryCta)} size="lg">
                  {primaryCta.label}
                </ButtonLink>
              ) : null}
              {highlightHref && wording.highlightLabel ? (
                <TextLink href={highlightHref} className="text-lg">
                  {wording.highlightLabel}
                </TextLink>
              ) : null}
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
