// Seeds Sanity with the demo content: market "uk", a fully built Mayfair-style
// club page with 5 approved FAQs, and a Moorgate-style club with facts only.
// Idempotent: fixed document ids + createOrReplace; Sanity de-duplicates
// identical image uploads.
//
//   pnpm seed            create or refresh the demo content
//   pnpm seed --reset    also delete Moorgate pages (incl. drafts) and AI-drafted
//                        FAQ items, to rehearse the live demo from a clean slate
//   pnpm seed --update   only add what is missing: new documents, new top-level
//                        fields and new page blocks. Never overwrites edits made
//                        in the Studio, so it is safe to run against production.
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import { demoClubs, demoFaqs, demoImages, demoPages, MOORGATE_ID } from '../lib/content/demo-data'
import { buildSeedDocuments, type SeedDocument } from '../lib/content/seed-documents'
import type { ImageData } from '../lib/content/types'

// Loads variables from .env.local without printing them.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN
const reset = process.argv.includes('--reset')
const update = process.argv.includes('--update')

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

type Keyed = { _key: string }

/** Adds missing documents, top-level fields and page blocks; changes nothing else. */
async function addMissing(docs: SeedDocument[]) {
  const existing = await client.getDocuments<SeedDocument>(docs.map((d) => d._id))
  const tx = client.transaction()
  const changes: string[] = []

  docs.forEach((doc, index) => {
    const current = existing[index]
    if (!current) {
      tx.createIfNotExists(doc)
      changes.push(`created ${doc._id}`)
      return
    }
    const missing = Object.fromEntries(
      Object.entries(doc).filter(([key]) => !key.startsWith('_') && current[key] === undefined),
    )
    if (Object.keys(missing).length) {
      tx.patch(doc._id, (p) => p.setIfMissing(missing))
      changes.push(`${doc._id}: added ${Object.keys(missing).join(', ')}`)
    }

    // New blocks go after the block that precedes them in the demo page.
    const seedBlocks = (doc.blocks as Keyed[] | undefined) ?? []
    const present = new Set(((current.blocks as Keyed[] | undefined) ?? []).map((b) => b._key))
    if (!current.blocks) return
    seedBlocks.forEach((block, i) => {
      if (present.has(block._key)) return
      const before = seedBlocks
        .slice(0, i)
        .reverse()
        .find((b) => present.has(b._key))
      tx.patch(doc._id, (p) =>
        before
          ? p.insert('after', `blocks[_key=="${before._key}"]`, [block])
          : p.insert('before', 'blocks[0]', [block]),
      )
      present.add(block._key)
      changes.push(`${doc._id}: added block ${block._key}`)
    })
  })

  if (changes.length === 0) {
    console.log('  update nothing to add')
    return
  }
  await tx.commit()
  for (const change of changes) console.log(`  update ${change}`)
}

async function main() {
  const mode = reset ? ' (with --reset)' : update ? ' (--update: add missing only)' : ''
  console.log(`Seeding ${projectId}/${dataset}${mode}`)

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
    return assetId
      ? {
          _type: 'image' as const,
          asset: { _type: 'reference' as const, _ref: assetId },
          alt: image.alt,
        }
      : undefined
  }

  if (update) {
    await addMissing(buildSeedDocuments(resolveImage))
    console.log('Done.')
    return
  }

  const tx = client.transaction()
  for (const doc of buildSeedDocuments(resolveImage)) tx.createOrReplace(doc)
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
