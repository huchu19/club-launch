// Sanity access for the demo scripts: a write client, a ledger of everything a
// recording created (so `demo:reset` can remove exactly that), and the editor's
// side of scene 6 — replacing the placeholders the drafter left behind.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient, type SanityClient } from '@sanity/client'
import { createdFile, demoDir, demoJoiningFee, placeholderValue } from './config'

export function demoSanityClient(): SanityClient {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!projectId || !token) {
    throw new Error(
      'Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN. Add them to .env.local (see .env.example).',
    )
  }
  return createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
    token,
    useCdn: false,
    perspective: 'raw',
  })
}

export type CreatedDoc = { id: string; what: string; at: string }

/** Everything the last recording created, newest last. */
export function readCreated(): CreatedDoc[] {
  if (!existsSync(createdFile)) return []
  try {
    const parsed: unknown = JSON.parse(readFileSync(createdFile, 'utf8'))
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is CreatedDoc =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as CreatedDoc).id === 'string' &&
        typeof (entry as CreatedDoc).what === 'string',
    )
  } catch {
    console.warn(`Could not read ${createdFile}; ignoring it.`)
    return []
  }
}

function writeCreated(docs: CreatedDoc[]) {
  mkdirSync(demoDir, { recursive: true })
  writeFileSync(createdFile, `${JSON.stringify(docs, null, 2)}\n`)
}

export function clearCreated(): void {
  writeCreated([])
}

/** Notes a document the recording created, so reset can remove exactly that. */
export function noteCreated(id: string, what: string): void {
  writeCreated([...readCreated(), { id, what, at: new Date().toISOString() }])
  console.log(`  created ${id} (${what})`)
}

/**
 * Notes a document and marks it `demo: true`, so reset can find it even if the
 * ledger is lost. The marker is a hidden, read-only field, so it never shows in
 * the Studio form or on the page.
 */
export async function recordCreated(client: SanityClient, id: string, what: string): Promise<void> {
  noteCreated(id, what)
  try {
    await client.patch(id).set({ demo: true }).commit({ visibility: 'async' })
  } catch (error) {
    console.warn(`  could not mark ${id} as demo content:`, message(error))
  }
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const TOKEN = /\[\[\s*([A-Za-z _-]+?)\s*:\s*([^\]]*?)\s*\]\]/g

function fillText(text: string): string {
  if (!text.includes('[[')) return text
  return text.replace(TOKEN, (_raw, kind: string, label: string) =>
    placeholderValue(
      kind
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_'),
      label.trim(),
    ),
  )
}

function fillValue(value: unknown): unknown {
  if (typeof value === 'string') return fillText(value)
  if (Array.isArray(value)) return value.map(fillValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        fillValue(child),
      ]),
    )
  }
  return value
}

const isNumeric = (value: unknown) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value)

type Block = Record<string, unknown> & { _type?: string }

/** Every price shown needs a joining fee beside it (the launch readiness rule). */
function addJoiningFees(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    if (block._type === 'ratesBlock' && Array.isArray(block.plans)) {
      return {
        ...block,
        plans: (block.plans as Block[]).map((plan) =>
          isNumeric(plan.joiningFee) ? plan : { ...plan, joiningFee: demoJoiningFee },
        ),
      }
    }
    if (block._type === 'foundingBlock' && !isNumeric(block.joiningFee)) {
      return { ...block, joiningFee: demoJoiningFee }
    }
    return block
  })
}

/**
 * Scene 6's editor step: replaces every `[[placeholder]]` in the drafted page
 * with a confirmed value and makes sure each price has a joining fee. Applied
 * through the API so the run is deterministic; the Studio is open on screen and
 * shows the fields, the banner and the launch checklist updating live.
 */
export async function fillPlaceholders(client: SanityClient, draftId: string): Promise<string[]> {
  const doc = await client.getDocument<Record<string, unknown>>(draftId)
  if (!doc) throw new Error(`The draft ${draftId} is not in the dataset`)

  const found = new Set<string>()
  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith('_')) continue
    for (const match of JSON.stringify(value ?? null).matchAll(TOKEN)) found.add(match[0])
  }

  const blocks = Array.isArray(doc.blocks)
    ? addJoiningFees(fillValue(doc.blocks) as Block[])
    : undefined
  await client
    .patch(draftId)
    .set({
      title: fillText(String(doc.title ?? '')),
      ...(doc.seo ? { seo: fillValue(doc.seo) } : {}),
      ...(blocks ? { blocks } : {}),
    })
    .commit()

  const replaced = [...found]
  for (const raw of replaced) console.log(`  filled ${raw}`)
  return replaced
}
