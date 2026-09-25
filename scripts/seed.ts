// Seeds Sanity with the demo content: market "uk", a fully built Mayfair-style
// club page with 5 approved FAQs, and a Moorgate-style club with facts only.
// Idempotent: fixed document ids + createOrReplace; Sanity de-duplicates
// identical image uploads.
//
//   pnpm seed            create or refresh the demo content
//   pnpm seed --reset    also delete Moorgate pages (incl. drafts) and AI-drafted
//                        FAQ items, to rehearse the live demo from a clean slate
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import {
  demoClubs,
  demoFaqs,
  demoImages,
  demoMarket,
  demoPages,
  MOORGATE_ID,
} from '../lib/content/demo-data'
import { arrayKey, stripUndefined, toSanityBlocks } from '../lib/content/to-sanity'
import type { Club, ImageData } from '../lib/content/types'
import { normalizeQuestion } from '../lib/faq/normalize'

// Loads variables from .env.local without printing them.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN
const reset = process.argv.includes('--reset')

if (!projectId || !token) {
  console.error(
    'Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN. Add them to .env.local (see .env.example).',
  )
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  useCdn: false,
  perspective: 'raw',
})

const MARKET_ID = `market-${demoMarket.code}`
const ref = (id: string) => ({ _type: 'reference' as const, _ref: id })

async function uploadImages(): Promise<Map<string, string>> {
  const assets = new Map<string, string>()
  for (const image of Object.values(demoImages)) {
    const file = path.join(process.cwd(), 'public', image.url)
    const asset = await client.assets.upload('image', createReadStream(file), {
      filename: path.basename(file),
    })
    assets.set(image.url, asset._id)
    console.log(`  image  ${path.basename(file)} → ${asset._id}`)
  }
  return assets
}

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
    facilities: club.facilities.map((f) => ({ _key: arrayKey(), _type: 'facility', ...f })),
    facts: club.facts.map((f) => ({ _key: arrayKey(), _type: 'fact', ...f })),
    seo: club.seo,
  })
}

async function main() {
  console.log(`Seeding ${projectId}/${dataset}${reset ? ' (with --reset)' : ''}`)

  if (reset) {
    await client.delete({
      query: '*[_type == "clubPage" && club._ref == $id]',
      params: { id: MOORGATE_ID },
    })
    await client.delete({ query: '*[_type == "faqItem" && source == "ai"]' })
    console.log('  reset  removed Moorgate pages and AI-drafted FAQ items')
  }

  const assets = await uploadImages()
  const resolveImage = (image: ImageData) => {
    const assetId = assets.get(image.url)
    return assetId ? { _type: 'image' as const, asset: ref(assetId), alt: image.alt } : undefined
  }

  const tx = client.transaction()
  tx.createOrReplace({ _id: MARKET_ID, _type: 'market', ...demoMarket })
  for (const club of demoClubs) tx.createOrReplace(clubDocument(club))
  for (const page of demoPages) {
    tx.createOrReplace({
      _id: page._id,
      _type: 'clubPage',
      club: ref(page.clubId),
      title: page.title,
      seo: page.seo,
      blocks: toSanityBlocks(page.blocks, resolveImage),
    })
  }
  for (const faq of demoFaqs) {
    tx.createOrReplace({
      _id: faq._id,
      _type: 'faqItem',
      club: ref(faq.clubId),
      question: faq.question,
      answer: faq.answer,
      status: faq.status,
      source: faq.source,
      askedCount: faq.askedCount,
      normalizedQuestion: normalizeQuestion(faq.question),
    })
  }
  const result = await tx.commit()
  console.log(
    `  wrote  ${result.results.length} documents (1 market, ${demoClubs.length} clubs, ${demoPages.length} page, ${demoFaqs.length} FAQs)`,
  )
  console.log('Done. Moorgate has facts only: create its page with the AI drafter at /admin/draft.')
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
