import { z } from 'zod'

// Contract between the FAQ "Anything else?" UI and POST /api/faq.
// Success responses stream the answer as text/plain; headers say what it is.

export const QUESTION_MAX_LENGTH = 300

export const faqRequestSchema = z.object({
  clubSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  question: z
    .string()
    .trim()
    .min(1, { error: 'Enter your question' })
    .max(QUESTION_MAX_LENGTH, {
      error: `Your question must be ${QUESTION_MAX_LENGTH} characters or fewer`,
    }),
})

export type FaqRequest = z.infer<typeof faqRequestSchema>

export const FAQ_HEADERS = {
  /** "approved" | "pending" | "fallback" */
  status: 'X-Faq-Status',
  /** "cache" | "model" | "fallback" */
  source: 'X-Faq-Source',
  /** Sanity id of the FAQ item, when one exists. */
  id: 'X-Faq-Id',
} as const

export type FaqAnswerStatus = 'approved' | 'pending' | 'fallback'
export type FaqAnswerSource = 'cache' | 'model' | 'fallback'

export const FALLBACK_ANSWER =
  'Sorry, we cannot answer that right now. The quickest way to find out is to book a tour or contact the club directly, and the team will be happy to help.'
