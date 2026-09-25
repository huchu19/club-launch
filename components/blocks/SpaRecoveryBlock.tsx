import { ArchImage } from '@/components/media/ArchImage'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { SpaRecoveryBlockData } from '@/lib/content/types'
import { cn } from '@/lib/cn'

export type SpaRecoveryBlockProps = Omit<SpaRecoveryBlockData, '_type' | '_key'> & { id?: string }

export function SpaRecoveryBlock({
  eyebrow,
  heading,
  intro,
  items,
  id = 'recovery',
}: SpaRecoveryBlockProps) {
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
      {items.length > 0 ? (
        <ul
          className={cn(
            'mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2',
            items.length >= 3 && 'lg:grid-cols-3',
          )}
        >
          {items.map((item) => (
            <li key={item._key}>
              <ArchImage
                image={item.image}
                sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 90vw"
              />
              <h3 className="mt-8 text-2xl">{item.name}</h3>
              <p className="mt-3 text-ink-muted">{item.description}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  )
}
