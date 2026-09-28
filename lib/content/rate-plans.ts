import { isNumeric } from '@/lib/format'
import type { PageBlock, RatePlan } from './types'

/** Membership plans on a club page (from its rates blocks). */
export function ratePlansOf(blocks: PageBlock[]): RatePlan[] {
  return blocks.flatMap((block) => (block._type === 'ratesBlock' ? block.plans : []))
}

export type PricedPlan = { key: string; name: string; pricePerMonth: number; joiningFee: number }

/** Plans with real prices (no draft placeholders), as numbers. */
export function pricedPlansOf(blocks: PageBlock[]): PricedPlan[] {
  return ratePlansOf(blocks).flatMap((plan) =>
    isNumeric(plan.pricePerMonth)
      ? [
          {
            key: plan._key,
            name: plan.name,
            pricePerMonth: Number(plan.pricePerMonth),
            joiningFee: plan.joiningFee && isNumeric(plan.joiningFee) ? Number(plan.joiningFee) : 0,
          },
        ]
      : [],
  )
}
