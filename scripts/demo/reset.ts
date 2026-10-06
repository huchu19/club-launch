// Removes everything a demo recording created, and nothing else:
//
//   pnpm demo:reset              delete the demo content
//   pnpm demo:reset --dry-run    list what would be deleted
//
// Four narrow rules, each logged. Documents from the seed are protected, and
// clubs and markets are never touched.
import type { SanityClient } from '@sanity/client'
import { buildSeedDocuments } from '../../lib/content/seed-documents'
import { normalizeQuestion } from '../../lib/faq/normalize'
import { draftedClub, script } from './config'
import { clearCreated, demoSanityClient, message, readCreated } from './sanity'

/** Seeded ids (and their drafts) must survive a reset. */
function protectedIds(): Set<string> {
  const ids = buildSeedDocuments(() => undefined).map((doc) => doc._id)
  return new Set([...ids, ...ids.map((id) => `drafts.${id}`)])
}

type Found = { _id: string; _type: string }

async function find(client: SanityClient, query: string, params: Record<string, unknown> = {}) {
  return client.fetch<Found[]>(`${query}{_id, _type}`, params)
}

export async function resetDemoContent({ dryRun = false } = {}): Promise<number> {
  const client = demoSanityClient()
  const safe = protectedIds()
  const targets = new Map<string, string>()
  const add = (id: string, reason: string) => {
    if (safe.has(id)) {
      console.warn(`  keep   ${id} (seeded content; ${reason})`)
      return
    }
    if (!targets.has(id)) targets.set(id, reason)
  }

  // 1. Documents the last recording logged as its own.
  const ledger = readCreated()
  if (ledger.length > 0) {
    const live = await client.fetch<string[]>('*[_id in $ids]._id', {
      ids: ledger.flatMap((doc) => [doc.id, `drafts.${doc.id.replace(/^drafts\./, '')}`]),
    })
    for (const doc of ledger) {
      for (const id of [doc.id, `drafts.${doc.id.replace(/^drafts\./, '')}`]) {
        if (live.includes(id)) add(id, `from the last recording: ${doc.what}`)
      }
    }
  }

  // 2. Anything still carrying the demo marker.
  for (const doc of await find(client, '*[demo == true]')) {
    add(doc._id, `marked demo: true (${doc._type})`)
  }

  // 3. The drafted club must have no page between recordings, so any page of
  //    its own — draft or published — was created by the demo.
  for (const doc of await find(client, '*[_type == "clubPage" && club._ref == $club]', {
    club: draftedClub.id,
  })) {
    add(doc._id, `${draftedClub.name} page, which the demo creates`)
  }

  // 4. The AI answer to the demo's own question.
  for (const doc of await find(
    client,
    '*[_type == "faqItem" && source == "ai" && normalizedQuestion == $question]',
    { question: normalizeQuestion(script.faqQuestion) },
  )) {
    add(doc._id, 'AI answer to the demo question')
  }

  for (const [id, reason] of targets) {
    if (id.startsWith('club-') || id.startsWith('market-')) {
      console.warn(`  keep   ${id} (club or market document; ${reason})`)
      targets.delete(id)
    }
  }

  if (targets.size === 0) {
    console.log('Nothing to reset: no demo content in the dataset.')
    if (!dryRun) clearCreated()
    return 0
  }

  for (const [id, reason] of targets) {
    console.log(`  ${dryRun ? 'would delete' : 'delete'} ${id} — ${reason}`)
    if (dryRun) continue
    try {
      await client.delete(id)
    } catch (error) {
      console.warn(`  could not delete ${id}:`, message(error))
    }
  }

  if (!dryRun) {
    clearCreated()
    console.log(
      `Reset ${targets.size} document${targets.size === 1 ? '' : 's'}. ${draftedClub.name} has no page again.`,
    )
  }
  return targets.size
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`Resetting demo content${dryRun ? ' (dry run)' : ''}`)
  await resetDemoContent({ dryRun })
}

// Only when run directly, not when `record.ts` imports the reset.
if (process.argv[1]?.endsWith('reset.ts')) {
  main().catch((error: unknown) => {
    console.error('Reset failed:', message(error))
    process.exit(1)
  })
}
