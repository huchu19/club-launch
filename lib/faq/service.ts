import { streamText, type LanguageModel } from 'ai'
import { z } from 'zod'
import type { ContentRepository } from '@/lib/content/repository'
import { offersOf } from '@/lib/content/rate-plans'
import { buildGroundingContext } from './context'
import { normalizeQuestion } from './normalize'
import { buildFaqPrompt, FAQ_INSTRUCTIONS } from './prompt'
import { FALLBACK_ANSWER, type FaqRequest } from './protocol'
import { redactPersonalData } from './redact'

// Server flow for "Anything else?" (docs/SPEC.md §5):
// 1. (route) validate + rate limit   2. repeat question → cached answer, no model call
// 3. ground on this club only        4. stream from the model
// 5. save as a pending FAQ item      6. model error/quota → friendly fallback, nothing saved

export type FaqResult =
  | { kind: 'not-found' }
  | { kind: 'cached'; id: string; answer: string; status: 'approved' | 'pending' }
  | { kind: 'fallback'; answer: string; reason: 'unavailable' | 'model-error' | 'empty' }
  | {
      kind: 'streaming'
      id: string
      stream: ReadableStream<Uint8Array>
      /** Resolves once the answer is saved (true) or deliberately not saved (false). */
      saved: Promise<boolean>
    }

export type FaqDeps = {
  repository: ContentRepository
  /** Called lazily so a missing API key becomes a fallback, not a crash. */
  model: () => LanguageModel
  newId?: () => string
}

/** A saved answer must be real text of a sensible length. */
const answerSchema = z.string().trim().min(1).max(2000)

type Part = { type: string; text?: string; error?: unknown }

/** One-line description for logs (status code and message, never the prompt). */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as { statusCode?: number }).statusCode
    return `${error.name}${status ? ` ${status}` : ''}: ${error.message}`
  }
  return String(error)
}

export async function answerVisitorQuestion(input: FaqRequest, deps: FaqDeps): Promise<FaqResult> {
  const club = await deps.repository.getClubBySlug(input.clubSlug)
  if (!club) return { kind: 'not-found' }

  const question = redactPersonalData(input.question.trim())
  const normalizedQuestion = normalizeQuestion(question)

  const match = await deps.repository.findFaqMatch(club._id, normalizedQuestion)
  if (match) {
    await deps.repository
      .incrementFaqAskedCount(match._id)
      .catch((error: unknown) => console.warn('[faq] could not increment askedCount', error))
    return { kind: 'cached', id: match._id, answer: match.answer, status: match.status }
  }

  let model: LanguageModel
  try {
    model = deps.model()
  } catch (error) {
    console.warn('[faq] model unavailable:', describeError(error))
    return { kind: 'fallback', answer: FALLBACK_ANSWER, reason: 'unavailable' }
  }

  const [approvedFaqs, page] = await Promise.all([
    deps.repository.getApprovedFaqs(club._id),
    deps.repository.getClubPage(club.market.code, club.slug),
  ])
  const offers = page ? offersOf(page.blocks) : { plans: [] }
  const result = streamText({
    model,
    instructions: FAQ_INSTRUCTIONS,
    prompt: buildFaqPrompt(buildGroundingContext(club, approvedFaqs, offers), question),
    temperature: 0.2,
    // No small maxOutputTokens: on Gemini "thinking" models the thinking tokens count
    // towards it and can leave an empty answer. The prompt asks for 2–4 sentences and
    // the saved answer is length-checked.
    // Quota errors don't clear in seconds; answer with the fallback straight away.
    maxRetries: 0,
  })
  const parts = result.stream[Symbol.asyncIterator]() as AsyncIterator<Part>

  // Wait for the first words (or a failure) before committing to a streamed reply,
  // so quota and API errors become a clean fallback response.
  let first = ''
  for (;;) {
    let next: IteratorResult<Part>
    try {
      next = await parts.next()
    } catch (error) {
      console.warn('[faq] model error before first token:', describeError(error))
      return { kind: 'fallback', answer: FALLBACK_ANSWER, reason: 'model-error' }
    }
    if (next.done) return { kind: 'fallback', answer: FALLBACK_ANSWER, reason: 'empty' }
    const part = next.value
    if (part.type === 'error' || part.type === 'abort') {
      console.warn('[faq] model error before first token:', describeError(part.error))
      return { kind: 'fallback', answer: FALLBACK_ANSWER, reason: 'model-error' }
    }
    if (part.type === 'text-delta' && part.text) {
      first = part.text
      break
    }
  }

  const id = deps.newId?.() ?? `faq-ai-${crypto.randomUUID()}`
  const encoder = new TextEncoder()
  let resolveSaved: (saved: boolean) => void = () => {}
  const saved = new Promise<boolean>((resolve) => {
    resolveSaved = resolve
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = first
      let failed = false
      controller.enqueue(encoder.encode(first))
      try {
        for (;;) {
          const next = await parts.next()
          if (next.done) break
          if (next.value.type === 'text-delta' && next.value.text) {
            answer += next.value.text
            controller.enqueue(encoder.encode(next.value.text))
          } else if (next.value.type === 'error' || next.value.type === 'abort') {
            failed = true
            break
          }
        }
      } catch {
        failed = true
      }

      if (failed) {
        // A cut-off answer is never saved.
        controller.enqueue(encoder.encode(`\n\n${FALLBACK_ANSWER}`))
        resolveSaved(false)
        controller.close()
        return
      }

      const valid = answerSchema.safeParse(answer)
      if (!valid.success) {
        resolveSaved(false)
      } else {
        // Saved before the response ends, so serverless keeps running until it's stored.
        try {
          await deps.repository.createPendingFaq({
            id,
            clubId: club._id,
            question,
            answer: valid.data,
            normalizedQuestion,
          })
          resolveSaved(true)
        } catch (error) {
          console.error('[faq] could not save pending answer:', describeError(error))
          resolveSaved(false)
        }
      }
      controller.close()
    },
  })

  return { kind: 'streaming', id, stream, saved }
}
