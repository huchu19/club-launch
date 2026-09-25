import { generateText, Output, type LanguageModel } from 'ai'
import type { ContentRepository } from '@/lib/content/repository'
import { toSanityBlocks } from '@/lib/content/to-sanity'
import type { Club } from '@/lib/content/types'
import { findPlaceholders, type Placeholder } from '@/lib/placeholders'
import { flagUnverifiedNumbers } from './guard'
import { buildDrafterPrompt, DRAFTER_INSTRUCTIONS } from './prompt'
import { draftOutputSchema, type DraftOutput, type DraftRequest, type Tone } from './schema'
import { draftToBlocks } from './to-blocks'

// SPEC §6: load the club's facts → structured output validated with zod →
// retry once → create a Sanity *draft* (never published) → report placeholders.

export const MAX_DRAFT_ATTEMPTS = 2

export class DraftGenerationError extends Error {
  readonly attempts = MAX_DRAFT_ATTEMPTS
}
export class ClubNotFoundError extends Error {}
export class ClubHasPageError extends Error {}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

/** Asks the model for a page; invalid output is retried once, then a clear error. */
export async function generateDraft(
  { club, brief, tone }: { club: Club; brief: string; tone: Tone },
  model: LanguageModel,
): Promise<{ draft: DraftOutput; attempts: number }> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_DRAFT_ATTEMPTS; attempt++) {
    try {
      const result = await generateText({
        model,
        instructions: DRAFTER_INSTRUCTIONS,
        prompt: buildDrafterPrompt(club, brief, tone),
        output: Output.object({ schema: draftOutputSchema }),
        temperature: 0.4,
        // Our loop is the single retry; don't stack SDK retries on top.
        maxRetries: 0,
      })
      // Output.object validates already; parse again so this code owns the guarantee.
      return { draft: draftOutputSchema.parse(result.output), attempts: attempt }
    } catch (error) {
      lastError = error
      console.warn(`[drafter] attempt ${attempt} failed: ${describe(error)}`)
    }
  }
  throw new DraftGenerationError(
    'The AI returned a page that did not pass validation twice, so nothing was saved. Try again, or simplify the brief.',
    { cause: lastError },
  )
}

/** Studio deep link that opens the draft of a document. */
export function studioEditPath(documentId: string, type = 'clubPage'): string {
  const publishedId = documentId.replace(/^drafts\./, '')
  return `/studio/intent/edit/id=${publishedId};type=${type}/`
}

const blockLabels: Record<string, string> = {
  heroBlock: 'Hero',
  facilitiesBlock: 'Facilities',
  spaRecoveryBlock: 'Spa & recovery',
  ratesBlock: 'Rates',
  tourBookingBlock: 'Tour booking',
  faqBlock: 'FAQ',
}

/** "blocks[3].plans[0].pricePerMonth" → "Rates › Plans 1 › Price per month". */
export function describePath(path: string, blockTypes: string[]): string {
  return path
    .split('.')
    .map((segment) => {
      const match = /^(\w+)\[(\d+)\]$/.exec(segment)
      if (match?.[1] === 'blocks') return blockLabels[blockTypes[Number(match[2])] ?? ''] ?? 'Block'
      const [name, index] = match ? [match[1]!, Number(match[2]) + 1] : [segment, undefined]
      const words = name.replace(/([A-Z])/g, ' $1').toLowerCase()
      const label = words === 'seo' ? 'SEO' : words.charAt(0).toUpperCase() + words.slice(1)
      return index ? `${label} ${index}` : label
    })
    .join(' › ')
}

export type DraftResult = {
  draftId: string
  studioPath: string
  clubName: string
  placeholders: Array<Placeholder & { location: string }>
  /** Numbers the model used that aren't in the club facts, now [[CHECK: ...]]. */
  flaggedNumbers: string[]
  attempts: number
}

export async function draftClubPage(
  request: DraftRequest,
  deps: { repository: ContentRepository; model: () => LanguageModel },
): Promise<DraftResult> {
  const club = await deps.repository.getClubById(request.clubId)
  if (!club) throw new ClubNotFoundError('That club could not be found.')

  const withoutPage = await deps.repository.listClubsWithoutPage()
  if (!withoutPage.some((c) => c._id === club._id)) {
    throw new ClubHasPageError(`${club.name} already has a page. Edit it in the studio instead.`)
  }

  const { draft, attempts } = await generateDraft(
    { club, brief: request.brief, tone: request.tone },
    deps.model(),
  )
  const guarded = flagUnverifiedNumbers(draft, club)
  const blocks = draftToBlocks(guarded.draft)

  const { id } = await deps.repository.createDraftClubPage({
    clubId: club._id,
    title: guarded.draft.title,
    seo: guarded.draft.seo,
    blocks: toSanityBlocks(blocks),
  })

  return {
    draftId: id,
    studioPath: studioEditPath(id),
    clubName: club.name,
    placeholders: findPlaceholders({
      title: guarded.draft.title,
      seo: guarded.draft.seo,
      blocks,
    }).map((p) => ({
      ...p,
      location: describePath(
        p.path,
        blocks.map((b) => b._type),
      ),
    })),
    flaggedNumbers: guarded.flagged,
    attempts,
  }
}
