import {
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  type LanguageModel,
} from 'ai'
import { ZodError } from 'zod'
import type { ContentRepository } from '@/lib/content/repository'
import type { Club, DayPlan, RatePlan } from '@/lib/content/types'
import { redactPersonalData } from '@/lib/faq/redact'
import {
  buildConciergePrompt,
  CONCIERGE_INSTRUCTIONS,
  conciergeContext,
  mentionsHealth,
  withHealthCaveat,
} from './prompt'
import {
  FAILED_MESSAGE,
  HEALTH_CAVEAT,
  REFUSAL_MESSAGE,
  UNAVAILABLE_MESSAGE,
  type DayPlanView,
} from './protocol'
import { planOutputSchema, type PlanOutput } from './schema'
import { checkPlan } from './validate'
import { toDayPlanView } from './view'

// Flow: ground on this club's spaces, timetable, hours and plans → structured
// output (zod) → check every stop against the club's real data → one retry
// with the problems fed back → store the structured plan (never the visitor's
// words) → return it with names and prices resolved.

export const MAX_PLAN_ATTEMPTS = 2

export type ConciergeResult =
  | { kind: 'planned'; plan: DayPlanView }
  | { kind: 'refusal' | 'failed' | 'unavailable'; message: string }

export type ConciergeInput = {
  club: Club
  plans: RatePlan[]
  message: string
  /** Only options offered by the block; anything else is dropped before this point. */
  chips: string[]
}

export type ConciergeDeps = {
  repository: ContentRepository
  /** Called lazily so a missing API key becomes "unavailable", not a crash. */
  model: () => LanguageModel
  newId?: () => string
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

/** An unguessable id for sharing a plan (16 characters, about 80 bits). */
export function newPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as { statusCode?: number }).statusCode
    return `${error.name}${status ? ` ${status}` : ''}: ${error.message}`
  }
  return String(error)
}

export async function planFirstDay(
  input: ConciergeInput,
  deps: ConciergeDeps,
): Promise<ConciergeResult> {
  let model: LanguageModel
  try {
    model = deps.model()
  } catch (error) {
    console.warn('[concierge] model unavailable:', describe(error))
    return { kind: 'unavailable', message: UNAVAILABLE_MESSAGE }
  }

  const message = redactPersonalData(input.message.trim())
  const context = conciergeContext(input.club, input.plans)
  let problems: string[] = []
  let plan: PlanOutput | undefined

  for (let attempt = 1; attempt <= MAX_PLAN_ATTEMPTS; attempt++) {
    let output: PlanOutput
    try {
      const result = await generateText({
        model,
        instructions: CONCIERGE_INSTRUCTIONS,
        prompt: buildConciergePrompt(context, message, input.chips, problems),
        output: Output.object({ schema: planOutputSchema }),
        temperature: 0.4,
        // Our loop is the single retry; quota errors don't clear in seconds.
        maxRetries: 0,
      })
      output = planOutputSchema.parse(result.output)
    } catch (error) {
      const badOutput =
        NoObjectGeneratedError.isInstance(error) ||
        NoOutputGeneratedError.isInstance(error) ||
        error instanceof ZodError
      if (badOutput) {
        console.warn(`[concierge] attempt ${attempt}: output did not match the schema`)
        problems = ['The previous reply did not match the required JSON structure.']
        continue
      }
      console.warn('[concierge] model error:', describe(error))
      return { kind: 'unavailable', message: UNAVAILABLE_MESSAGE }
    }

    if (output.offTopic) return { kind: 'refusal', message: REFUSAL_MESSAGE }

    problems = checkPlan(output, input.club, input.plans)
    if (problems.length === 0) {
      plan = output
      break
    }
    console.warn(`[concierge] attempt ${attempt}: ${problems.length} problem(s): ${problems[0]}`)
  }

  if (!plan) return { kind: 'failed', message: FAILED_MESSAGE }

  const healthMentioned = mentionsHealth(`${message} ${input.chips.join(' ')}`)
  const dayPlan: DayPlan = {
    publicId: deps.newId?.() ?? newPublicId(),
    clubId: input.club._id,
    day: plan.day,
    summary: plan.summary,
    stops: plan.stops.map(({ className, ...stop }) => ({
      ...stop,
      ...(className.trim() ? { className: className.trim() } : {}),
    })),
    recommendedPlanName: plan.recommendedPlanName,
    caveats: withHealthCaveat(plan.caveats, healthMentioned, HEALTH_CAVEAT),
    chips: input.chips,
  }

  const view = toDayPlanView(dayPlan, input.club, input.plans)
  try {
    await deps.repository.createDayPlan(dayPlan)
  } catch (error) {
    // The visitor still gets their plan; it just can't be attached to a tour or shared.
    console.warn('[concierge] could not save the plan:', describe(error))
    return { kind: 'planned', plan: { ...view, id: undefined } }
  }
  return { kind: 'planned', plan: view }
}
