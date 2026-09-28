import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Section } from '@/components/ui/Section'
import type { PricedPlan } from '@/lib/content/rate-plans'
import type { CalculatorBlockData, ComparisonItem } from '@/lib/content/types'
import { CostCalculator } from './CostCalculator'

export type CalculatorBlockProps = Omit<CalculatorBlockData, '_type' | '_key'> & {
  clubName: string
  /** The club's plans with real prices; the block renders nothing without one. */
  plans: PricedPlan[]
  /** Typical local prices from the market, for the "paying separately" comparison. */
  comparisons: ComparisonItem[]
  locale?: string
  currency?: string
  id?: string
}

export function CalculatorBlock({
  eyebrow,
  heading,
  intro,
  comparisonLabel,
  clubName,
  plans,
  comparisons,
  locale,
  currency,
  id = 'cost',
}: CalculatorBlockProps) {
  if (plans.length === 0) return null
  const headingId = `${id}-heading`
  return (
    <Section id={id} aria-labelledby={headingId} className="border-t border-line">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Heading level={2} id={headingId}>
            {heading}
          </Heading>
          {intro ? <p className="mt-6 max-w-md text-lg text-ink-muted">{intro}</p> : null}
        </div>
        <Card elevation="raised">
          <CostCalculator
            clubName={clubName}
            plans={plans}
            comparisons={comparisons}
            comparisonLabel={comparisonLabel}
            locale={locale}
            currency={currency}
          />
        </Card>
      </div>
    </Section>
  )
}
