import { z } from 'zod'

// Shared by the tour form (client) and /api/tour (server): one source of
// truth for validation and error wording.

export const timeSlots = ['morning', 'afternoon', 'evening'] as const
export type TimeSlot = (typeof timeSlots)[number]

export const timeSlotLabels: Record<TimeSlot, string> = {
  morning: 'Morning (07:00–12:00)',
  afternoon: 'Afternoon (12:00–17:00)',
  evening: 'Evening (17:00–21:00)',
}

/** Latest bookable day, counted from today. */
export const MAX_DAYS_AHEAD = 90

/** Today's date as YYYY-MM-DD in the club's time zone. */
export function todayIso(timeZone = 'Europe/London', now = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function isRealDate(iso: string): boolean {
  const date = new Date(`${iso}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso
}

export function createTourRequestSchema(today: string = todayIso()) {
  const latest = addDaysIso(today, MAX_DAYS_AHEAD)
  return z.object({
    clubSlug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    name: z
      .string()
      .trim()
      .min(1, { error: 'Enter your name' })
      .max(100, { error: 'Name must be 100 characters or fewer' }),
    email: z
      .string()
      .trim()
      .min(1, { error: 'Enter your email address' })
      .max(254, { error: 'Email address must be 254 characters or fewer' })
      .pipe(
        z.email({ error: 'Enter an email address in the correct format, like name@example.com' }),
      ),
    phone: z
      .string()
      .trim()
      .max(30, { error: 'Phone number must be 30 characters or fewer' })
      .regex(/^[+\d\s()-]*$/, {
        error: 'Enter a phone number using digits, spaces, brackets and + only',
      })
      .optional(),
    preferredDate: z
      .string()
      .min(1, { error: 'Enter a preferred date' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Enter a real date' })
      .refine(isRealDate, { error: 'Enter a real date' })
      .refine((d) => d >= today, { error: 'Choose a date from today onwards' })
      .refine((d) => d <= latest, {
        error: `Choose a date within the next ${MAX_DAYS_AHEAD} days`,
      }),
    timeSlot: z.enum(timeSlots, { error: 'Choose a time of day' }),
    consent: z.literal(true, {
      error: 'Tick the box to agree that we can contact you about your tour',
    }),
    /** Honeypot. Real visitors never see or fill it. */
    website: z.string().max(200).optional(),
  })
}

export type TourRequest = z.infer<ReturnType<typeof createTourRequestSchema>>

export type TourField = Exclude<keyof TourRequest, 'clubSlug' | 'website'>

export type TourFieldErrors = Partial<Record<TourField, string>>

/** First error message per field. */
export function tourFieldErrors(error: z.ZodError): TourFieldErrors {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>
  const out: TourFieldErrors = {}
  for (const [field, messages] of Object.entries(flat)) {
    if (messages?.[0]) out[field as TourField] = messages[0]
  }
  return out
}

export type TourSubmitResult =
  | { ok: true; reference: string }
  | { ok: false; kind: 'invalid'; fieldErrors: TourFieldErrors }
  | { ok: false; kind: 'rate-limited' | 'error'; message: string }
