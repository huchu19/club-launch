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
import { demoClubs, demoFaqs, demoImages, demoPages, MOORGATE_ID } from '../lib/content/demo-data'
import { buildSeedDocuments } from '../lib/content/seed-documents'
import type { ImageData } from '../lib/content/types'

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
    return assetId
      ? {
          _type: 'image' as const,
          asset: { _type: 'reference' as const, _ref: assetId },
          alt: image.alt,
        }
      : undefined
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
