import { describe, expect, it } from 'vitest'
import { demoClubs } from '@/lib/content/demo-data'
import { healthClubJsonLd, serializeJsonLd } from './jsonld'

const mayfair = demoClubs[0]!

describe('healthClubJsonLd', () => {
  const data = healthClubJsonLd(mayfair, {
    url: 'https://example.com/uk/clubs/linden-mayfair',
    image: 'https://example.com/hero.jpg',
  })

  it('describes the club as a schema.org HealthClub', () => {
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'HealthClub',
      name: 'Linden Mayfair',
      url: 'https://example.com/uk/clubs/linden-mayfair',
      telephone: '020 7946 0018',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '7 Linden Mews',
        addressLocality: 'Mayfair, London',
        postalCode: 'W1K 2AB',
        addressCountry: 'GB',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 51.5098, longitude: -0.1492 },
    })
  })

  it('groups days that share opening hours', () => {
    expect((data as { openingHoursSpecification?: unknown }).openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '06:00',
        closes: '22:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Friday'],
        opens: '06:00',
        closes: '22:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday', 'Sunday'],
        opens: '07:00',
        closes: '21:00',
      },
    ])
  })

  it('omits optional properties the club does not have', () => {
    const bare = healthClubJsonLd(
      { ...mayfair, phone: undefined, geo: undefined, openingHours: [] },
      { url: 'https://example.com' },
    )
    expect(bare).not.toHaveProperty('telephone')
    expect(bare).not.toHaveProperty('geo')
    expect(bare).not.toHaveProperty('openingHoursSpecification')
    expect(bare).not.toHaveProperty('image')
  })
})

describe('serializeJsonLd', () => {
  it('escapes "<" so CMS text cannot close the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' })
  })
})
