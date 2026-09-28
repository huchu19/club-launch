import { z } from 'zod'
import { contactFields, fieldErrors } from '@/lib/tour/schema'

// Shared by the founding signup form (client) and /api/founding (server): the
// same contact fields and honeypot as the tour form.

export const foundingSignupSchema = z.object({
  ...contactFields,
  consent: z.literal(true, {
    error: 'Tick the box to agree that we can contact you about founding membership',
  }),
})

export type FoundingSignup = z.infer<typeof foundingSignupSchema>
export type FoundingField = 'name' | 'email' | 'phone' | 'consent'
export type FoundingFieldErrors = Partial<Record<FoundingField, string>>

export const foundingFieldErrors = (error: z.ZodError) => fieldErrors<FoundingField>(error)

export type FoundingSubmitResult =
  | { ok: true; reference: string; placesLeft: number }
  | { ok: false; kind: 'invalid'; fieldErrors: FoundingFieldErrors }
  | { ok: false; kind: 'sold-out'; message: string }
  | { ok: false; kind: 'rate-limited' | 'error'; message: string }

/** What the live count endpoint returns. */
export const foundingStatusSchema = z.object({ total: z.number(), placesLeft: z.number() })
