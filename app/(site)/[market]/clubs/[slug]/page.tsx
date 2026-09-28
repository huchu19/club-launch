import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import { JsonLd } from '@/components/seo/JsonLd'
import { periodOfHour } from '@/lib/atmosphere/period'
import { getContentRepository } from '@/lib/content'
import { clubPath } from '@/lib/content/types'
import { healthClubJsonLd } from '@/lib/seo/jsonld'
import { clubPageDescription, clubPageImage, clubPageMetadata } from '@/lib/seo/metadata'
import { absoluteUrl } from '@/lib/site'
import { localMoment } from '@/lib/time/local-time'

type Params = { market: string; slug: string }

// Re-render at least every 15 minutes so the time-of-day hero follows the club's clock.
// Content edits still go live at once through the publish webhook.
export const revalidate = 900
type Props = { params: Promise<Params> }

async function loadPage({ market, slug }: Params) {
  const { isEnabled: preview } = await draftMode()
  return getContentRepository().getClubPage(market, slug, { preview })
}

/** Published pages are prerendered; new ones render on first request, then stay cached. */
export async function generateStaticParams(): Promise<Params[]> {
  const pages = await getContentRepository().listClubPages()
  return pages.map((page) => ({ market: page.market, slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await loadPage(await params)
  return page ? clubPageMetadata(page) : { title: 'Club not found' }
}

export default async function ClubPage({ params }: Props) {
  const page = await loadPage(await params)
  if (!page) notFound()

  const url = absoluteUrl(clubPath(page.club.market.code, page.club.slug))
  // The club's own clock, read at render time (the page regenerates every 15 minutes).
  const moment = localMoment(new Date(), page.club.timeZone)
  return (
    <>
      <JsonLd
        data={healthClubJsonLd(page.club, {
          url,
          image: clubPageImage(page),
          description: clubPageDescription(page),
        })}
      />
      <BlockRenderer page={page} period={periodOfHour(moment.hour)} today={moment.day} />
    </>
  )
}
