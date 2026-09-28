import type { ComparisonItem, Usage } from '@/lib/content/types'

// The cost calculator's arithmetic, kept pure so every edge case is unit-tested.
// A month is 52/12 weeks. Every chosen thing counts once per visit when paid for
// separately. The joining fee is shown spread over the first year.

export const MAX_VISITS_PER_WEEK = 7
export const WEEKS_PER_MONTH = 52 / 12
export const JOINING_FEE_MONTHS = 12

export type CalculatorInput = {
  visitsPerWeek: number
  uses: readonly Usage[]
  pricePerMonth: number
  joiningFee?: number
  comparisons: readonly ComparisonItem[]
}

export type SeparateCost = ComparisonItem & { monthly: number }

export type CalculatorResult = {
  visitsPerWeek: number
  visitsPerMonth: number
  membershipMonthly: number
  /** Null when there are no visits to divide by. */
  costPerVisit: number | null
  joiningFeeMonthly: number
  /** Membership plus the joining fee spread over the first year. */
  firstYearMonthly: number
  firstYearCostPerVisit: number | null
  separately: SeparateCost[]
  separatelyMonthly: number
  /** Paying separately minus the first-year monthly cost; negative when membership costs more. */
  monthlySaving: number
}

/** Rounds to whole pence. */
export const roundMoney = (amount: number) => Math.round(amount * 100) / 100

/** Whole visits between 0 and MAX_VISITS_PER_WEEK; anything else (NaN, negatives) is clamped. */
export function clampVisits(visitsPerWeek: number): number {
  if (!Number.isFinite(visitsPerWeek)) return 0
  return Math.min(MAX_VISITS_PER_WEEK, Math.max(0, Math.round(visitsPerWeek)))
}

export function calculateCost(input: CalculatorInput): CalculatorResult {
  const visitsPerWeek = clampVisits(input.visitsPerWeek)
  const visitsPerMonth = visitsPerWeek * WEEKS_PER_MONTH
  const membershipMonthly = Math.max(0, input.pricePerMonth)
  const joiningFeeMonthly = Math.max(0, input.joiningFee ?? 0) / JOINING_FEE_MONTHS
  const firstYearMonthly = membershipMonthly + joiningFeeMonthly
  const perVisit = (monthly: number) =>
    visitsPerMonth > 0 ? roundMoney(monthly / visitsPerMonth) : null

  // One benchmark per use, in the order the visitor sees them. Uses without a
  // benchmark in this market are left out of the comparison.
  const chosen = input.uses.flatMap((usage) => {
    const item = input.comparisons.find((c) => c.usage === usage)
    return item ? [item] : []
  })
  const separately = chosen.map((item) => ({
    ...item,
    monthly: roundMoney(item.unitPrice * visitsPerMonth),
  }))
  const separatelyMonthly = roundMoney(
    chosen.reduce((sum, item) => sum + item.unitPrice, 0) * visitsPerMonth,
  )

  return {
    visitsPerWeek,
    visitsPerMonth: Math.round(visitsPerMonth * 10) / 10,
    membershipMonthly: roundMoney(membershipMonthly),
    costPerVisit: perVisit(membershipMonthly),
    joiningFeeMonthly: roundMoney(joiningFeeMonthly),
    firstYearMonthly: roundMoney(firstYearMonthly),
    firstYearCostPerVisit: perVisit(firstYearMonthly),
    separately,
    separatelyMonthly,
    monthlySaving: roundMoney(separatelyMonthly - firstYearMonthly),
  }
}
