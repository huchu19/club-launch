import { defineLocations, type PresentationPluginOptions } from 'sanity/presentation'

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    clubPage: defineLocations({
      select: { title: 'title', slug: 'club.slug.current', market: 'club.market.code' },
      resolve: (doc) =>
        doc?.slug
          ? {
              locations: [
                {
                  title: doc.title ?? 'Club page',
                  href: `/${doc.market ?? 'uk'}/clubs/${doc.slug}`,
                },
              ],
            }
          : null,
    }),
  },
}
