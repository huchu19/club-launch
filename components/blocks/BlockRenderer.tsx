import { periodHighlights, type Period } from '@/lib/atmosphere/period'
import { pricedPlansOf } from '@/lib/content/rate-plans'
import {
  clubPath,
  type ClubPageData,
  type PageBlock,
  type PageBlockType,
} from '@/lib/content/types'
import { groupOpeningHours } from '@/lib/format'
import { CalculatorBlock } from './CalculatorBlock'
import { ClubMapBlock } from './ClubMapBlock'
import { ConciergeBlock } from './ConciergeBlock'
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
  conciergeBlock: 'plan-your-day',
  calculatorBlock: 'cost',
  clubMapBlock: 'map',
}

/**
 * Renders a club page's blocks in order. Each Sanity block type maps
 * one-to-one to a component of the same name (docs/SPEC.md §3).
 */
export function BlockRenderer({ page, period }: { page: ClubPageData; period?: Period }) {
  const { club } = page
  const seen = new Set<PageBlockType>()
  const tourSectionId = page.blocks.some((b) => b._type === 'tourBookingBlock')
    ? anchors.tourBookingBlock
    : undefined
  const plannerSectionId = page.blocks.some((b) => b._type === 'conciergeBlock')
    ? anchors.conciergeBlock
    : undefined
  // The hero points to a different section at each time of day, if the page has it.
  const highlight = period ? periodHighlights[period].section : undefined
  const highlightHref =
    highlight && page.blocks.some((b) => anchors[b._type] === highlight)
      ? `#${highlight}`
      : undefined

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
          <HeroBlock
            key={block._key}
            id={ctx.id}
            headingLevel={ctx.isFirst ? 1 : 2}
            period={period}
            highlightHref={highlightHref}
            {...block}
          />
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
      case 'conciergeBlock':
        return (
          <ConciergeBlock
            key={block._key}
            id={ctx.id}
            eyebrow={block.eyebrow}
            heading={block.heading}
            intro={block.intro}
            chips={block.chips}
            clubSlug={club.slug}
            clubName={club.name}
            locale={club.market.locale}
            currency={club.market.currency}
            tourSectionId={tourSectionId}
            sharePath={`${clubPath(club.market.code, club.slug)}/day`}
          />
        )
      case 'calculatorBlock':
        return (
          <CalculatorBlock
            key={block._key}
            id={ctx.id}
            eyebrow={block.eyebrow}
            heading={block.heading}
            intro={block.intro}
            comparisonLabel={block.comparisonLabel}
            clubName={club.name}
            plans={pricedPlansOf(ctx.page.blocks)}
            comparisons={club.market.comparisonItems}
            locale={club.market.locale}
            currency={club.market.currency}
          />
        )
      case 'clubMapBlock':
        return (
          <ClubMapBlock
            key={block._key}
            id={ctx.id}
            eyebrow={block.eyebrow}
            heading={block.heading}
            intro={block.intro}
            club={club}
            plannerSectionId={plannerSectionId}
          />
        )
      default: {
        const unknown: never = block
        return unknown
      }
    }
  }
}
