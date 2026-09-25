import type { Metadata } from 'next'
import { clubPath, type ClubPageData } from '@/lib/content/types'
import { absoluteUrl } from '@/lib/site'

export function clubPageDescription(page: ClubPageData): string | undefined {
  const hero = page.blocks.find((b) => b._type === 'heroBlock')
  return page.seo?.description ?? page.club.seo?.description ?? hero?.subheading
}

export function clubPageImage(page: ClubPageData): string | undefined {
  const hero = page.blocks.find((b) => b._type === 'heroBlock')
  const url = hero?.image?.url
  if (!url) return undefined
  return url.startsWith('http') ? url : absoluteUrl(url)
}

/** Page SEO fields, then club SEO fields, then sensible fallbacks. */
export function clubPageMetadata(page: ClubPageData): Metadata {
  const { club } = page
  const title = page.seo?.title ?? club.seo?.title ?? `${club.name} — ${page.title}`
  const description = clubPageDescription(page)
  const path = clubPath(club.market.code, club.slug)
  const image = clubPageImage(page)
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: path,
      locale: club.market.locale.replace('-', '_'),
      siteName: club.name,
      ...(image ? { images: [{ url: image, alt: `${club.name}` }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description },
  }
}
