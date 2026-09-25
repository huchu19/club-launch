import type { ClubPageData, PageBlock, PageBlockType } from '@/lib/content/types'
import { groupOpeningHours } from '@/lib/format'
import { FacilitiesBlock } from './FacilitiesBlock'
import { FaqBlock } from './FaqBlock'
import { HeroBlock } from './HeroBlock'
import { RatesBlock } from './RatesBlock'
import { SpaRecoveryBlock } from './SpaRecoveryBlock'
import { TourBookingBlock } from './TourBookingBlock'

/** In-page anchors. The hero CTA links to #tour and #faq. */
const anchors: Record<PageBlockType, string> = {
  heroBlock: 'hero',
  facilitiesBlock: 'facilities',
  spaRecoveryBlock: 'recovery',
  ratesBlock: 'rates',
  tourBookingBlock: 'tour',
  faqBlock: 'faq',
}

/**
 * Renders a club page's blocks in order. Each Sanity block type maps
 * one-to-one to a component of the same name (docs/SPEC.md §3).
 */
export function BlockRenderer({ page }: { page: ClubPageData }) {
  const { club } = page
  const seen = new Set<PageBlockType>()

  return (
    <>
      {page.blocks.map((block, index) => {
        // First block of a type gets the plain anchor; repeats get a unique one.
        const id = seen.has(block._type)
          ? `${anchors[block._type]}-${block._key}`
          : anchors[block._type]
        seen.add(block._type)
        return renderBlock(block, { id, page, isFirst: index === 0 })
      })}
    </>
  )

  function renderBlock(
    block: PageBlock,
    ctx: { id: string; page: ClubPageData; isFirst: boolean },
  ): React.ReactNode {
    switch (block._type) {
      case 'heroBlock':
        return (
          <HeroBlock key={block._key} id={ctx.id} headingLevel={ctx.isFirst ? 1 : 2} {...block} />
        )
      case 'facilitiesBlock':
        return (
          <FacilitiesBlock
            key={block._key}
            id={ctx.id}
            heading={block.heading}
            intro={block.intro}
            facilities={block.facilities?.length ? block.facilities : club.facilities}
          />
        )
      case 'spaRecoveryBlock':
        return <SpaRecoveryBlock key={block._key} id={ctx.id} {...block} />
      case 'ratesBlock':
        return (
          <RatesBlock
            key={block._key}
            id={ctx.id}
            {...block}
            locale={club.market.locale}
            currency={club.market.currency}
          />
        )
      case 'tourBookingBlock':
        return (
          <TourBookingBlock
            key={block._key}
            id={ctx.id}
            heading={block.heading}
            intro={block.intro}
            club={{
              name: club.name,
              slug: club.slug,
              address: `${club.address.streetAddress}, ${club.address.locality} ${club.address.postalCode}`,
              phone: club.phone,
              openingHours: groupOpeningHours(club.openingHours),
            }}
          />
        )
      case 'faqBlock':
        return (
          <FaqBlock
            key={block._key}
            id={ctx.id}
            heading={block.heading}
            intro={block.intro}
            allowQuestions={block.allowQuestions}
            faqs={ctx.page.faqs}
            clubSlug={club.slug}
          />
        )
      default: {
        const unknown: never = block
        return unknown
      }
    }
  }
}
