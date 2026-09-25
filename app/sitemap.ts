import type { MetadataRoute } from 'next'
import { getContentRepository } from '@/lib/content'
import { clubPath } from '@/lib/content/types'
import { absoluteUrl } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await getContentRepository().listClubPages()
  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    ...pages.map((page) => ({
      url: absoluteUrl(clubPath(page.market, page.slug)),
      lastModified: page.updatedAt ? new Date(page.updatedAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
