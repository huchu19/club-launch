import { isNumeric } from '@/lib/format'
import type { FoundingBlockData, PageBlock, RatePlan } from './types'

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

export type PageOffers = { plans: PricedPlan[]; founding?: FoundingBlockData }

/**
 * The prices a page offers. Membership prices live only in the page's rates
 * block (and a founding offer in its own block), never in the club's facts, so
 * anything that needs a price (FAQ grounding, planner, calculator) reads it here.
 */
export function offersOf(blocks: PageBlock[]): PageOffers {
  const founding = blocks.find((b): b is FoundingBlockData => b._type === 'foundingBlock')
  return { plans: pricedPlansOf(blocks), ...(founding ? { founding } : {}) }
}
