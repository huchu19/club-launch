import type { DayOfWeek, HealthClub, OpeningHoursSpecification, WithContext } from 'schema-dts'
import type { Club } from '@/lib/content/types'

/**
 * schema.org HealthClub for a club page (docs/SPEC.md §7). Typed against
 * schema-dts so the structure is checked at compile time.
 */
export function healthClubJsonLd(
  club: Club,
  { url, image, description }: { url: string; image?: string; description?: string },
): WithContext<HealthClub> {
  // One specification per distinct opening time, listing the days it applies to.
  const byHours = new Map<string, { opens: string; closes: string; days: DayOfWeek[] }>()
  for (const entry of club.openingHours) {
    const key = `${entry.opens}-${entry.closes}`
    const group = byHours.get(key) ?? { opens: entry.opens, closes: entry.closes, days: [] }
    group.days.push(entry.day as DayOfWeek)
    byHours.set(key, group)
  }
  const openingHoursSpecification: OpeningHoursSpecification[] = [...byHours.values()].map(
    (group) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: group.days,
      opens: group.opens,
      closes: group.closes,
    }),
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'HealthClub',
    name: club.name,
    url,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(club.phone ? { telephone: club.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: club.address.streetAddress,
      addressLocality: club.address.locality,
      postalCode: club.address.postalCode,
      addressCountry: club.address.country,
    },
    ...(club.geo
      ? { geo: { '@type': 'GeoCoordinates', latitude: club.geo.lat, longitude: club.geo.lng } }
      : {}),
    ...(openingHoursSpecification.length ? { openingHoursSpecification } : {}),
  }
}

/** Serialises JSON-LD for a <script> tag, escaping "<" so content can't close the tag. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
