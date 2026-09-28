import type { ImageData, PageBlock } from './types'

// Converts view-model blocks to Sanity documents: array members get _key and
// _type, and images become asset references. Used by `pnpm seed` and the AI
// drafter (whose blocks have no images).

type SanityImage = { _type: 'image'; asset: { _type: 'reference'; _ref: string }; alt: string }
export type ImageResolver = (image: ImageData) => SanityImage | undefined

const noImages: ImageResolver = () => undefined

/** Short, stable-enough keys for array members. */
export function arrayKey(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function keyed<T extends object>(items: T[] | undefined, type: string, withKeys = true) {
  return (items ?? []).map((item) => ({
    _type: type,
    ...(withKeys ? { _key: arrayKey() } : {}),
    ...item,
  }))
}

export function toSanityBlock(block: PageBlock, resolveImage: ImageResolver = noImages) {
  const image = (img?: ImageData) => (img ? resolveImage(img) : undefined)
  switch (block._type) {
    case 'heroBlock':
      return {
        ...block,
        image: image(block.image),
        periodVariants: block.periodVariants.length
          ? block.periodVariants.map((variant) => ({
              _key: variant.period,
              _type: 'heroPeriodVariant',
              ...variant,
            }))
          : undefined,
      }
    case 'facilitiesBlock':
      return {
        ...block,
        facilities: block.facilities?.length ? keyed(block.facilities, 'facility') : undefined,
      }
    case 'spaRecoveryBlock':
      return {
        ...block,
        items: block.items.map((item) => ({
          ...item,
          _type: 'spaRecoveryItem',
          image: image(item.image),
        })),
      }
    case 'ratesBlock':
      return { ...block, plans: block.plans.map((plan) => ({ ...plan, _type: 'ratePlan' })) }
    case 'tourBookingBlock':
    case 'faqBlock':
    case 'conciergeBlock':
    case 'calculatorBlock':
    case 'clubMapBlock':
    case 'busynessBlock':
    case 'foundingBlock':
      return { ...block }
  }
}

export function toSanityBlocks(blocks: PageBlock[], resolveImage?: ImageResolver) {
  return blocks.map((block) => stripUndefined(toSanityBlock(block, resolveImage)))
}

/** Sanity rejects nothing for undefined, but dropping it keeps documents tidy. */
export function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
