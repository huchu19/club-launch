import { Card } from '@/components/ui/Card'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { RatesBlockData } from '@/lib/content/types'
import { formatPrice, isNumeric } from '@/lib/format'
import { cn } from '@/lib/cn'

export type RatesBlockProps = Omit<RatesBlockData, '_type' | '_key'> & {
  locale?: string
  currency?: string
  id?: string
}

export function RatesBlock({
  heading,
  plans,
  note,
  locale = 'en-GB',
  currency = 'GBP',
  id = 'rates',
}: RatesBlockProps) {
  const headingId = `${id}-heading`
  return (
    <Section id={id} aria-labelledby={headingId}>
      <Heading level={2} id={headingId} className="max-w-2xl">
        {heading}
      </Heading>
      <ul
        className={cn(
          'mt-12 grid gap-6',
          plans.length === 2 && 'md:grid-cols-2',
          plans.length >= 3 && 'md:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {plans.map((plan) => {
          const price = formatPrice(plan.pricePerMonth, locale, currency)
          return (
            <li key={plan._key}>
              <Card className="flex h-full flex-col">
                <h3 className="text-2xl">{plan.name}</h3>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={cn(
                      'font-display tracking-tight text-ink',
                      isNumeric(plan.pricePerMonth) ? 'text-5xl' : 'text-xl text-accent',
                    )}
                  >
                    {price}
                  </span>
                  <span className="text-ink-muted">per month</span>
                </p>
                {plan.joiningFee ? (
                  <p className="mt-1 text-sm text-ink-muted">
                    Joining fee {formatPrice(plan.joiningFee, locale, currency)}
                  </p>
                ) : null}
                {plan.inclusions.length > 0 ? (
                  <ul className="mt-8 space-y-3 border-t border-line pt-6">
                    {plan.inclusions.map((inclusion) => (
                      <li key={inclusion} className="flex gap-3">
                        <svg
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          className="mt-1 size-4 shrink-0 text-brand"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m4 10.5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{inclusion}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            </li>
          )
        })}
      </ul>
      {note ? <p className="mt-8 max-w-2xl text-sm text-ink-muted">{note}</p> : null}
    </Section>
  )
}
