'use client'

import { useId, useState } from 'react'
import { calculateCost, MAX_VISITS_PER_WEEK } from '@/lib/calculator/calculate'
import type { PricedPlan } from '@/lib/content/rate-plans'
import { usages, type ComparisonItem, type Usage } from '@/lib/content/types'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

export const usageLabels: Record<Usage, string> = {
  gym: 'The gym',
  classes: 'Classes',
  spa: 'The spa',
  recovery: 'Recovery',
  cowork: 'Co-working',
}

export type CostCalculatorProps = {
  clubName: string
  plans: PricedPlan[]
  comparisons: ComparisonItem[]
  comparisonLabel?: string
  locale?: string
  currency?: string
  initialVisitsPerWeek?: number
  initialUses?: Usage[]
}

const visitsText = (n: number) => `${n} ${n === 1 ? 'visit' : 'visits'} a week`

export function CostCalculator({
  clubName,
  plans,
  comparisons,
  comparisonLabel,
  locale = 'en-GB',
  currency = 'GBP',
  initialVisitsPerWeek = 3,
  initialUses = ['gym', 'classes'],
}: CostCalculatorProps) {
  const id = useId()
  const offered = usages.filter((usage) => comparisons.some((c) => c.usage === usage))
  const [visits, setVisits] = useState(initialVisitsPerWeek)
  const [uses, setUses] = useState<Usage[]>(initialUses.filter((u) => offered.includes(u)))
  const [planKey, setPlanKey] = useState(plans[0]?.key)
  const plan = plans.find((p) => p.key === planKey) ?? plans[0]
  if (!plan) return null

  const money = (amount: number) => formatMoney(amount, locale, currency)
  const result = calculateCost({
    visitsPerWeek: visits,
    uses: offered.filter((u) => uses.includes(u)),
    pricePerMonth: plan.pricePerMonth,
    joiningFee: plan.joiningFee,
    comparisons,
  })
  const toggle = (usage: Usage) =>
    setUses((current) =>
      current.includes(usage) ? current.filter((u) => u !== usage) : [...current, usage],
    )

  const summary =
    result.costPerVisit === null
      ? `${money(result.membershipMonthly)} a month. Choose how often you’d visit to see a cost per visit.`
      : `${money(result.costPerVisit)} per visit, ${money(result.membershipMonthly)} a month.`

  return (
    <div className="space-y-10">
      <div className="space-y-8">
        <div className="space-y-3">
          <label htmlFor={`${id}-visits`} className="block font-medium text-ink">
            How often would you visit?
          </label>
          <div className="flex items-center gap-5">
            <input
              id={`${id}-visits`}
              type="range"
              min={0}
              max={MAX_VISITS_PER_WEEK}
              step={1}
              value={visits}
              aria-valuetext={visitsText(visits)}
              onChange={(e) => setVisits(Number(e.target.value))}
              className="h-11 w-full cursor-pointer accent-brand"
            />
            <output htmlFor={`${id}-visits`} className="w-32 shrink-0 text-right font-medium">
              {visitsText(visits)}
            </output>
          </div>
        </div>

        {offered.length > 0 ? (
          <fieldset>
            <legend className="font-medium text-ink">What would you use?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {offered.map((usage) => {
                const on = uses.includes(usage)
                return (
                  <label
                    key={usage}
                    className={cn(
                      'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 transition-colors duration-200 ease-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-brand',
                      on
                        ? 'border-brand bg-brand-wash text-ink'
                        : 'border-line-strong bg-surface text-ink hover:bg-raised',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(usage)}
                      className="size-4 accent-brand focus-visible:outline-none"
                    />
                    {usageLabels[usage]}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : null}

        {plans.length > 1 ? (
          <fieldset>
            <legend className="font-medium text-ink">Membership</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {plans.map((p) => (
                <label
                  key={p.key}
                  className={cn(
                    'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 transition-colors duration-200 ease-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-brand',
                    p.key === plan.key
                      ? 'border-brand bg-brand-wash text-ink'
                      : 'border-line-strong bg-surface text-ink hover:bg-raised',
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-plan`}
                    value={p.key}
                    checked={p.key === plan.key}
                    onChange={() => setPlanKey(p.key)}
                    className="size-4 accent-brand focus-visible:outline-none"
                  />
                  {p.name}
                  <span className="text-ink-muted">{money(p.pricePerMonth)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {summary}
      </p>

      <div className="grid gap-6 border-t border-line pt-8 sm:grid-cols-2">
        <div>
          <p className="text-sm text-ink-muted">Each visit works out at</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-ink">
            {result.costPerVisit === null ? '–' : money(result.costPerVisit)}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {result.costPerVisit === null
              ? 'Choose how often you’d visit.'
              : `Based on about ${result.visitsPerMonth} visits a month.`}
          </p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">{plan.name} membership</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            {money(result.membershipMonthly)}
            <span className="text-lg font-normal text-ink-muted"> a month</span>
          </p>
          {result.joiningFeeMonthly > 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              Plus a {money(plan.joiningFee)} joining fee: {money(result.joiningFeeMonthly)} a month
              over your first year.
            </p>
          ) : null}
        </div>
      </div>

      {offered.length > 0 ? (
        <ComparisonChart
          clubName={clubName}
          membership={result.firstYearMonthly}
          separately={result.separatelyMonthly}
          breakdown={result.separately}
          hasJoiningFee={result.joiningFeeMonthly > 0}
          money={money}
        />
      ) : null}

      <div className="space-y-2 text-sm text-ink-muted">
        {result.joiningFeeMonthly > 0 ? (
          <p>
            The {money(plan.joiningFee)} joining fee is paid once. Spread over 12 months it adds{' '}
            {money(result.joiningFeeMonthly)} a month
            {result.firstYearCostPerVisit === null
              ? ''
              : `, making each visit ${money(result.firstYearCostPerVisit)} in your first year`}
            .
          </p>
        ) : null}
        {comparisons.length > 0 ? (
          <p>
            {comparisonLabel ?? 'Typical prices, for comparison.'}{' '}
            {comparisons.map((c) => `${c.label} ${money(c.unitPrice)} per ${c.unit}`).join(', ')}.
            Each thing you choose is counted once per visit.
          </p>
        ) : null}
      </div>
    </div>
  )
}

type ComparisonChartProps = {
  clubName: string
  membership: number
  separately: number
  breakdown: ReturnType<typeof calculateCost>['separately']
  hasJoiningFee: boolean
  money: (amount: number) => string
}

/**
 * Two horizontal bars: membership (brand, the emphasis) against paying
 * separately (recessive grey). Values sit at the bar tips in text colours;
 * the full breakdown is in a visually hidden table for screen readers.
 */
function ComparisonChart({
  clubName,
  membership,
  separately,
  breakdown,
  hasJoiningFee,
  money,
}: ComparisonChartProps) {
  const captionId = useId()
  const max = Math.max(membership, separately, 1)
  const rows = [
    {
      label: `${clubName} membership`,
      detail: hasJoiningFee ? 'Including the joining fee, spread over a year' : undefined,
      value: membership,
      bar: 'bg-brand',
    },
    {
      label: 'Paying separately',
      detail: breakdown.length ? breakdown.map((b) => b.label).join(', ') : 'Nothing chosen yet',
      value: separately,
      bar: 'bg-line-strong',
    },
  ]
  return (
    <figure aria-labelledby={captionId} className="space-y-5">
      <figcaption id={captionId} className="font-medium text-ink">
        A month at the club, compared with paying separately
      </figcaption>
      <div aria-hidden="true" className="space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span className="text-ink">{row.label}</span>
              <span className="font-semibold text-ink tabular-nums">{money(row.value)}</span>
            </div>
            <div className="mt-2 h-6">
              <div
                title={`${row.label}: ${money(row.value)} a month`}
                className={cn(
                  'h-full rounded-r-[4px] transition-[width] duration-300 ease-soft',
                  row.bar,
                )}
                style={{ width: row.value > 0 ? `max(2px, ${(row.value / max) * 100}%)` : 0 }}
              />
            </div>
            {row.detail ? <p className="mt-1 text-sm text-ink-muted">{row.detail}</p> : null}
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Monthly cost, compared with paying separately</caption>
        <thead>
          <tr>
            <th scope="col">Option</th>
            <th scope="col">Cost a month</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              {clubName} membership
              {hasJoiningFee ? ', including the joining fee spread over a year' : ''}
            </th>
            <td>{money(membership)}</td>
          </tr>
          {breakdown.map((item) => (
            <tr key={item.usage}>
              <th scope="row">
                {item.label} at {money(item.unitPrice)} per {item.unit}
              </th>
              <td>{money(item.monthly)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Paying separately in total</th>
            <td>{money(separately)}</td>
          </tr>
        </tbody>
      </table>
    </figure>
  )
}
