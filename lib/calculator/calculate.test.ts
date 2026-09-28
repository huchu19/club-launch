import { describe, expect, it } from 'vitest'
import { demoMarket } from '@/lib/content/demo-data'
import { calculateCost, clampVisits, MAX_VISITS_PER_WEEK, WEEKS_PER_MONTH } from './calculate'

const comparisons = demoMarket.comparisonItems
const base = { pricePerMonth: 245, joiningFee: 150, comparisons }

describe('calculateCost', () => {
  it('works out monthly cost, cost per visit and the separate total', () => {
    const result = calculateCost({ ...base, visitsPerWeek: 3, uses: ['gym', 'classes'] })
    const visits = 3 * WEEKS_PER_MONTH // 13 visits a month
    expect(result.visitsPerMonth).toBe(13)
    expect(result.membershipMonthly).toBe(245)
    expect(result.costPerVisit).toBeCloseTo(245 / visits, 2)
    expect(result.separately.map((s) => s.label)).toEqual([
      'Gym day pass',
      'Boutique fitness class',
    ])
    expect(result.separatelyMonthly).toBeCloseTo((25 + 28) * visits, 2)
    expect(result.monthlySaving).toBeCloseTo((25 + 28) * visits - (245 + 150 / 12), 2)
  })

  it('handles zero visits without dividing by zero', () => {
    const result = calculateCost({ ...base, visitsPerWeek: 0, uses: ['gym', 'spa'] })
    expect(result.visitsPerMonth).toBe(0)
    expect(result.costPerVisit).toBeNull()
    expect(result.firstYearCostPerVisit).toBeNull()
    expect(result.separatelyMonthly).toBe(0)
    // Membership still costs money when you don't go.
    expect(result.monthlySaving).toBe(-257.5)
  })

  it('caps visits at the maximum and ignores fractions and nonsense', () => {
    const max = calculateCost({ ...base, visitsPerWeek: 99, uses: ['gym'] })
    expect(max.visitsPerWeek).toBe(MAX_VISITS_PER_WEEK)
    expect(max.visitsPerMonth).toBeCloseTo(MAX_VISITS_PER_WEEK * WEEKS_PER_MONTH, 1)
    expect(max.costPerVisit).toBeCloseTo(245 / (MAX_VISITS_PER_WEEK * WEEKS_PER_MONTH), 2)
    expect(clampVisits(2.6)).toBe(3)
    expect(clampVisits(-4)).toBe(0)
    expect(clampVisits(Number.NaN)).toBe(0)
  })

  it('spreads the joining fee over the first year', () => {
    const result = calculateCost({ ...base, visitsPerWeek: 2, uses: ['gym'] })
    expect(result.joiningFeeMonthly).toBe(12.5)
    expect(result.firstYearMonthly).toBe(257.5)
    expect(result.firstYearCostPerVisit).toBeCloseTo(257.5 / (2 * WEEKS_PER_MONTH), 2)
  })

  it('treats a missing joining fee as none', () => {
    const result = calculateCost({ pricePerMonth: 175, comparisons, visitsPerWeek: 1, uses: [] })
    expect(result.joiningFeeMonthly).toBe(0)
    expect(result.firstYearMonthly).toBe(175)
  })

  it('compares nothing when nothing is chosen, and skips uses without a benchmark', () => {
    expect(calculateCost({ ...base, visitsPerWeek: 3, uses: [] }).separatelyMonthly).toBe(0)
    const partial = calculateCost({
      ...base,
      comparisons: comparisons.filter((c) => c.usage !== 'spa'),
      visitsPerWeek: 1,
      uses: ['spa', 'cowork'],
    })
    expect(partial.separately.map((s) => s.usage)).toEqual(['cowork'])
  })

  it('rounds money to whole pence', () => {
    const result = calculateCost({ ...base, visitsPerWeek: 1, uses: ['classes'] })
    for (const value of [result.costPerVisit!, result.separatelyMonthly, result.monthlySaving]) {
      expect(Math.round(value * 100) / 100).toBe(value)
    }
  })
})
