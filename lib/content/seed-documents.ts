import { normalizeQuestion } from '@/lib/faq/normalize'
import { demoClubs, demoFaqs, demoMarket, demoPages } from './demo-data'
import { arrayKey, stripUndefined, toSanityBlocks, type ImageResolver } from './to-sanity'
import type { Club } from './types'

// The Sanity documents `pnpm seed` writes, built from the demo data. Shared
// with tests, which run the app's GROQ queries over exactly these documents.

export const MARKET_ID = `market-${demoMarket.code}`

const ref = (id: string) => ({ _type: 'reference' as const, _ref: id })

function clubDocument(club: Club) {
  return stripUndefined({
    _id: club._id,
    _type: 'club',
    name: club.name,
    slug: { _type: 'slug', current: club.slug },
    market: ref(MARKET_ID),
    tier: club.tier,
    status: club.status,
    address: club.address,
    geo: club.geo ? { _type: 'geopoint', lat: club.geo.lat, lng: club.geo.lng } : undefined,
    openingHours: club.openingHours.map((h) => ({
      _key: arrayKey(),
      _type: 'openingHoursEntry',
      ...h,
    })),
    phone: club.phone,
    spaces: club.spaces.map((space) => ({
      _key: space.id,
      _type: 'space',
      ...space,
      openingHours: space.openingHours.map((h) => ({
        _key: arrayKey(),
        _type: 'openingHoursEntry',
        ...h,
      })),
    })),
    timeZone: club.timeZone,
    clubMap: club.clubMap
      ? {
          _type: 'clubMap',
          viewBox: club.clubMap.viewBox,
          floors: club.clubMap.floors.map((floor, f) => ({
            _key: `floor-${f}`,
            _type: 'mapFloor',
            name: floor.name,
            zones: floor.zones.map((zone) => ({
              _key: zone.spaceId,
              _type: 'mapZone',
              ...zone,
            })),
            features: floor.features.map((feature, i) => ({
              _key: `feature-${i}`,
              _type: 'mapFeature',
              ...feature,
            })),
          })),
        }
      : undefined,
    schedule: club.schedule.map((entry) => ({
      _key: `${entry.day.slice(0, 3).toLowerCase()}-${entry.time.replace(':', '')}-${entry.spaceId}`,
      _type: 'scheduleEntry',
      ...entry,
    })),
    facts: club.facts.map((f) => ({ _key: arrayKey(), _type: 'fact', ...f })),
    seo: club.seo,
  })
}

export type SeedDocument = { _id: string; _type: string } & Record<string, unknown>

export function buildSeedDocuments(resolveImage: ImageResolver): SeedDocument[] {
  return [
    {
      _id: MARKET_ID,
      _type: 'market',
      ...demoMarket,
      comparisonItems: demoMarket.comparisonItems.map((item) => ({
        _key: item.usage,
        _type: 'comparisonItem',
        ...item,
      })),
    },
    ...demoClubs.map(clubDocument),
    ...demoPages.map((page) => ({
      _id: page._id,
      _type: 'clubPage',
      club: ref(page.clubId),
      title: page.title,
      seo: page.seo,
      blocks: toSanityBlocks(page.blocks, resolveImage),
    })),
    ...demoFaqs.map((faq) => ({
      _id: faq._id,
      _type: 'faqItem',
      club: ref(faq.clubId),
      question: faq.question,
      answer: faq.answer,
      status: faq.status,
      source: faq.source,
      askedCount: faq.askedCount,
      normalizedQuestion: normalizeQuestion(faq.question),
    })),
  ]
}
