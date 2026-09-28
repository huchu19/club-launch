import { offersOf } from '../content/rate-plans'
import type { Club, PageBlock } from '../content/types'

// One source per club fact. Hours, address, phone, spaces (the facilities list)
// and the timetable live on the club; membership prices live in the page's
// rates block and a founding offer's price in its own block. This audit finds
// anything that stores or restates one of them somewhere else.

export type AuditPage = { clubId: string; title: string; blocks: PageBlock[] }

/** Club fields that must never be copied into a block. */
const CLUB_FIELDS = [
  'openingHours',
  'address',
  'phone',
  'geo',
  'facilities',
  'spaces',
  'schedule',
  'timeZone',
  'facts',
  'clubMap',
]

/** Where a price may appear: the structured price fields of the offer blocks. */
const PRICE_FIELDS = new Set([
  'ratesBlock.plans.pricePerMonth',
  'ratesBlock.plans.joiningFee',
  'foundingBlock.pricePerMonth',
  'foundingBlock.joiningFee',
])

const PRICE = /£\s?\d/
const normal = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')
const digits = (text: string) => text.replace(/\D/g, '')

/** Every string in a value, with a path of field names (array indexes dropped). */
function strings(value: unknown, path: string[] = []): Array<{ path: string; text: string }> {
  if (typeof value === 'string') return [{ path: path.join('.'), text: value }]
  if (Array.isArray(value)) return value.flatMap((item) => strings(item, path))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      key.startsWith('_') || key === 'image' ? [] : strings(child, [...path, key]),
    )
  }
  return []
}

export function auditSingleSource({
  clubs,
  pages,
}: {
  clubs: Club[]
  pages: AuditPage[]
}): string[] {
  const problems: string[] = []

  for (const page of pages) {
    const club = clubs.find((c) => c._id === page.clubId)
    if (!club) continue
    const times = new Set(club.openingHours.flatMap((h) => [h.opens, h.closes]))
    const descriptions = new Set(
      club.spaces.map((s) => normal(s.description ?? '')).filter(Boolean),
    )

    page.blocks.forEach((block, index) => {
      const where = `"${page.title}", block ${index + 1} (${block._type})`
      const record = block as unknown as Record<string, unknown>
      for (const field of CLUB_FIELDS) {
        const value = record[field]
        if (value !== undefined && !(Array.isArray(value) && value.length === 0)) {
          problems.push(`${where} stores "${field}", which belongs on the club.`)
        }
      }

      for (const { path, text } of strings(block, [block._type])) {
        if (club.phone && digits(text).includes(digits(club.phone))) {
          problems.push(`${where} repeats the club's phone number in ${path}.`)
        }
        if (text.includes(club.address.postalCode) || text.includes(club.address.streetAddress)) {
          problems.push(`${where} repeats the club's address in ${path}.`)
        }
        const time = [...text.matchAll(/\b\d{2}:\d{2}\b/g)].find((m) => times.has(m[0]))
        if (time) {
          problems.push(`${where} repeats the opening time ${time[0]} in ${path}.`)
        }
        if (PRICE.test(text) && !PRICE_FIELDS.has(path)) {
          problems.push(`${where} states a price in ${path}; prices belong in the offer blocks.`)
        }
        if (path.endsWith('.description') && descriptions.has(normal(text))) {
          problems.push(
            `${where} copies a space's description in ${path}; describe it differently or read it from the club.`,
          )
        }
      }
    })

    // The club's facts must not restate a price the page already offers.
    const offers = offersOf(page.blocks)
    const amounts = new Set(
      [
        ...offers.plans.flatMap((p) => [p.pricePerMonth, p.joiningFee]),
        ...(offers.founding
          ? [Number(offers.founding.pricePerMonth), Number(offers.founding.joiningFee)]
          : []),
      ]
        .filter((n) => n > 0)
        .map(String),
    )
    for (const fact of club.facts) {
      const stated = [...fact.value.matchAll(/£\s?(\d+(?:\.\d{1,2})?)/g)].map((m) => m[1]!)
      if (stated.some((amount) => amounts.has(amount))) {
        problems.push(
          `${club.name}'s fact "${fact.label}" restates a membership price from the page.`,
        )
      }
    }
  }

  return problems
}
