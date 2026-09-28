// One-off migration to a single source for club facts (M17), in two stages:
//
//   pnpm tsx scripts/migrations/single-source.ts prepare [--apply]
//     Before deploying: give every club that only has a facilities list the
//     same entries as spaces. Safe for the current code, which ignores spaces
//     it doesn't use.
//   pnpm tsx scripts/migrations/single-source.ts finish [--apply]
//     After deploying: remove the old facilities lists, the membership prices
//     repeated in club facts, and the facilities override on page blocks; and
//     reword seeded copy that restated a fact, only where it is still exactly
//     as seeded (an editor's change is never overwritten). Then audit.
//
// Without --apply it only prints what it would do.
import { createClient } from '@sanity/client'
import { clubPageSchema } from '../../lib/content/types'
import { auditSingleSource } from '../../lib/facts/audit'
import { CLUB_PAGE_QUERY } from '../../lib/sanity/queries'

process.loadEnvFile('.env.local') // read, never printed
const [stage] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const apply = process.argv.includes('--apply')
if (stage !== 'prepare' && stage !== 'finish') {
  console.error('Usage: single-source.ts prepare|finish [--apply]')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2025-01-01',
  useCdn: false,
  perspective: 'raw',
})

type Facility = { name: string; category: string; description?: string }
type Fact = { _key: string; label: string; value: string }
type ClubDoc = {
  _id: string
  name: string
  facilities?: Facility[]
  spaces?: unknown[]
  facts?: Fact[]
}
type Block = { _key: string; _type: string; [key: string]: unknown }
type PageDoc = { _id: string; title: string; blocks?: Block[] }

const PRICE_FACTS = [
  'Club membership',
  'Club and workspace membership',
  'Off-peak membership',
  'Joining fee',
]
const OLD_COPY: Array<{ block: string; path: string; from: string; to: string | null }> = [
  {
    block: 'hero',
    path: 'periodVariants[_key=="morning"].subheading',
    from: 'Start slowly: mobility in the studio, a few calm lengths, breakfast in the garden kitchen. The club opens at 06:00 on weekdays.',
    to: 'Start slowly: mobility in the studio, a few calm lengths, breakfast in the garden kitchen. The club opens early on weekdays.',
  },
  {
    block: 'rates',
    path: 'note',
    from: 'All memberships are monthly with 30 days’ notice. Members must be 18 or over.',
    to: null,
  },
  {
    block: 'recovery',
    path: 'items[_key=="contrast"].description',
    from: 'Cold plunge pools beside the sauna for hot and cold circuits.',
    to: 'Move between heat and cold at your own pace, a few steps from the sauna.',
  },
]

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const get = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, part) => {
    const keyed = /^(\w+)\[_key=="([^"]+)"\]$/.exec(part)
    if (keyed) {
      const list = (current as Record<string, unknown> | undefined)?.[keyed[1]!] as
        Array<{ _key: string }> | undefined
      return list?.find((item) => item._key === keyed[2])
    }
    return (current as Record<string, unknown> | undefined)?.[part]
  }, value)

async function main() {
  const clubs = await client.fetch<ClubDoc[]>(
    `*[_type == "club"]{ _id, name, facilities, spaces, facts }`,
  )
  const pages = await client.fetch<PageDoc[]>(`*[_type == "clubPage"]{ _id, title, blocks }`)
  const tx = client.transaction()
  const changes: string[] = []

  for (const club of clubs) {
    if (stage === 'prepare' && !club.spaces?.length && club.facilities?.length) {
      const spaces = club.facilities.map((f) => ({
        _key: slug(f.name),
        _type: 'space',
        id: slug(f.name),
        name: f.name,
        category: f.category,
        description: f.description,
        typicalUses: [],
        openingHours: [],
      }))
      tx.patch(club._id, (p) => p.set({ spaces }))
      changes.push(`${club._id}: add ${spaces.length} spaces from its facilities`)
    }
    if (stage === 'finish') {
      if (club.facilities !== undefined) {
        if (!club.spaces?.length) {
          changes.push(
            `${club._id}: SKIPPED removing facilities (no spaces yet; run prepare first)`,
          )
        } else {
          tx.patch(club._id, (p) => p.unset(['facilities']))
          changes.push(`${club._id}: remove the old facilities list`)
        }
      }
      for (const fact of club.facts ?? []) {
        if (PRICE_FACTS.includes(fact.label)) {
          tx.patch(club._id, (p) => p.unset([`facts[_key=="${fact._key}"]`]))
          changes.push(
            `${club._id}: remove the price fact "${fact.label}" (the page's rates block has it)`,
          )
        }
      }
    }
  }

  if (stage === 'finish') {
    for (const page of pages) {
      for (const block of page.blocks ?? []) {
        if (block._type === 'facilitiesBlock' && block.facilities !== undefined) {
          tx.patch(page._id, (p) => p.unset([`blocks[_key=="${block._key}"].facilities`]))
          changes.push(`${page._id}: remove the facilities override from block ${block._key}`)
        }
        for (const copy of OLD_COPY.filter((c) => c.block === block._key)) {
          if (get(block, copy.path) !== copy.from) continue
          const path = `blocks[_key=="${block._key}"].${copy.path}`
          tx.patch(page._id, (p) =>
            copy.to === null ? p.unset([path]) : p.set({ [path]: copy.to }),
          )
          changes.push(`${page._id}: reword ${block._key}.${copy.path} (it restated a club fact)`)
        }
      }
    }
  }

  console.log(`${stage}${apply ? '' : ' (dry run)'}: ${changes.length} change(s)`)
  for (const change of changes) console.log(`  ${change}`)
  if (apply && changes.length) {
    await tx.commit()
    console.log('Applied.')
  }

  if (stage === 'finish' && apply) {
    // Audit the live content the way CI audits the seed.
    const published = pages.filter((p) => !p._id.startsWith('drafts.'))
    const views = []
    for (const page of published) {
      const slugs = await client.fetch<{ market: string; slug: string }>(
        `*[_id == $id][0]{ "market": club->market->code, "slug": club->slug.current }`,
        { id: page._id },
      )
      const raw = await client
        .withConfig({ perspective: 'published' })
        .fetch(CLUB_PAGE_QUERY, slugs)
      if (raw) views.push(clubPageSchema.parse(raw))
    }
    const problems = auditSingleSource({
      clubs: views.map((v) => v.club),
      pages: views.map((v) => ({ clubId: v.club._id, title: v.title, blocks: v.blocks })),
    })
    console.log(
      problems.length ? `Audit: ${problems.length} problem(s)` : 'Audit: one source per club fact.',
    )
    for (const problem of problems) console.log(`  ${problem}`)
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
