import { APICallError, generateText, Output, type LanguageModel } from 'ai'
import type { ContentRepository } from '@/lib/content/repository'
import { toSanityBlocks } from '@/lib/content/to-sanity'
import type { Club } from '@/lib/content/types'
import { findPlaceholders, type Placeholder } from '@/lib/placeholders'
import { studioEditPath } from '@/lib/studio'
import { flagUnverifiedNumbers } from './guard'
import { buildDrafterPrompt, DRAFTER_INSTRUCTIONS } from './prompt'
import { draftOutputSchema, type DraftOutput, type DraftRequest, type Tone } from './schema'
import { draftToBlocks } from './to-blocks'

// SPEC §6: load the club's facts → structured output validated with zod →
// retry once → create a Sanity *draft* (never published) → report placeholders.

export const MAX_DRAFT_ATTEMPTS = 2

/** Extra tries after a provider overload response (5xx), with backoff between them. */
export const OVERLOAD_RETRIES = 2
export const OVERLOAD_RETRY_BASE_MS = 1_000

/**
 * The model's output failed validation, twice. Distinct from
 * {@link DraftUnavailableError}: the provider answered, the answer was just
 * the wrong shape.
 */
export class DraftGenerationError extends Error {
  readonly attempts = MAX_DRAFT_ATTEMPTS
}
/**
 * The provider itself reported it was overloaded or rate-limited, even after
 * retrying. The model's output was never the problem, so this is never
 * folded into "validation failed twice" (see isOverloaded/isRateLimited).
 */
export class DraftUnavailableError extends Error {}
export class ClubNotFoundError extends Error {}
export class ClubHasPageError extends Error {}

const BUSY_MESSAGE = 'The AI is busy right now. Please try again in a moment.'
const RATE_LIMITED_MESSAGE =
  'The AI has reached its usage limit for now. Please try again in a few minutes.'

function describe(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as { statusCode?: number }).statusCode
    return `${error.name}${status ? ` ${status}` : ''}: ${error.message}`
  }
  return String(error)
}

/** 5xx ("high demand"): usually clears within a few seconds, so worth a quick retry. */
function isOverloaded(error: unknown): boolean {
  return APICallError.isInstance(error) && (error.statusCode ?? 0) >= 500
}

/**
 * 429 (quota or rate limit): unlike overload this doesn't clear in seconds,
 * so — as in lib/concierge/service.ts — it is never retried automatically.
 */
function isRateLimited(error: unknown): boolean {
  return APICallError.isInstance(error) && error.statusCode === 429
}

/** Exponential backoff with full jitter: try 1 waits up to 2×base, try 2 up to 4×base, … */
function jitteredDelay(tries: number, baseMs: number): number {
  return Math.random() * baseMs * 2 ** tries
}

/**
 * One structured call to the model, retried with backoff while the provider
 * reports it is overloaded. A schema-shaped failure (bad or missing JSON) is
 * thrown straight away, for the outer loop in {@link generateDraft} to retry
 * with a fresh attempt instead.
 */
async function requestDraft(
  model: LanguageModel,
  prompt: string,
  overloadRetries: number,
  overloadBaseDelayMs: number,
): Promise<DraftOutput> {
  for (let tries = 1; ; tries++) {
    try {
      const result = await generateText({
        model,
        instructions: DRAFTER_INSTRUCTIONS,
        prompt,
        output: Output.object({ schema: draftOutputSchema }),
        temperature: 0.4,
        // Our loops are the retry; don't stack SDK retries on top.
        maxRetries: 0,
      })
      // Output.object validates already; parse again so this code owns the guarantee.
      return draftOutputSchema.parse(result.output)
    } catch (error) {
      if (tries > overloadRetries || !isOverloaded(error)) throw error
      const delay = jitteredDelay(tries, overloadBaseDelayMs)
      console.warn(
        `[drafter] model overloaded, retrying in ${Math.round(delay)}ms (try ${tries}/${overloadRetries}): ${describe(error)}`,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export type GenerateDraftOptions = {
  /** Extra tries after a 5xx overload response, before giving up (tests). */
  overloadRetries?: number
  /** Base backoff delay in ms, before the jitter and exponent are applied (tests). */
  overloadBaseDelayMs?: number
}

/**
 * Asks the model for a page. A schema-shaped failure (bad or malformed JSON)
 * is retried once with the same prompt, as before. A provider overload is
 * retried with backoff first (see requestDraft); if the provider is still
 * overloaded, or reports a rate limit, that is reported distinctly from a
 * validation failure — the provider never actually answered.
 */
export async function generateDraft(
  { club, brief, tone }: { club: Club; brief: string; tone: Tone },
  model: LanguageModel,
  options: GenerateDraftOptions = {},
): Promise<{ draft: DraftOutput; attempts: number }> {
  const overloadRetries = options.overloadRetries ?? OVERLOAD_RETRIES
  const overloadBaseDelayMs = options.overloadBaseDelayMs ?? OVERLOAD_RETRY_BASE_MS
  const prompt = buildDrafterPrompt(club, brief, tone)
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_DRAFT_ATTEMPTS; attempt++) {
    try {
      const draft = await requestDraft(model, prompt, overloadRetries, overloadBaseDelayMs)
      return { draft, attempts: attempt }
    } catch (error) {
      if (isRateLimited(error)) {
        console.warn(`[drafter] model rate-limited: ${describe(error)}`)
        throw new DraftUnavailableError(RATE_LIMITED_MESSAGE, { cause: error })
      }
      if (isOverloaded(error)) {
        console.warn(`[drafter] model still overloaded after retrying: ${describe(error)}`)
        throw new DraftUnavailableError(BUSY_MESSAGE, { cause: error })
      }
      lastError = error
      console.warn(`[drafter] attempt ${attempt} failed: ${describe(error)}`)
    }
  }
  throw new DraftGenerationError(
    'The AI returned a page that did not pass validation twice, so nothing was saved. Try again, or simplify the brief.',
    { cause: lastError },
  )
}

export { studioEditPath } from '@/lib/studio'

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
  deps: {
    repository: ContentRepository
    model: () => LanguageModel
  } & GenerateDraftOptions,
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
    { overloadRetries: deps.overloadRetries, overloadBaseDelayMs: deps.overloadBaseDelayMs },
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
