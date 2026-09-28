import { z } from 'zod'
import { timeOfDaySchema, weekdays } from '@/lib/content/types'

// Contract between the "Plan your first day" block and POST /api/concierge.

export const MESSAGE_MAX_LENGTH = 500
export const MAX_CHIPS = 5

export const conciergeRequestSchema = z
  .object({
    clubSlug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    message: z
      .string()
      .trim()
      .max(MESSAGE_MAX_LENGTH, {
        error: `Keep it to ${MESSAGE_MAX_LENGTH} characters or fewer`,
      })
      .default(''),
    chips: z.array(z.string().trim().min(1).max(60)).max(MAX_CHIPS).default([]),
  })
  .refine((request) => request.message.length > 0 || request.chips.length > 0, {
    error: 'Tell us a little about your week, or choose one of the options',
    path: ['message'],
  })

export type ConciergeRequest = z.input<typeof conciergeRequestSchema>

export const dayPlanStopViewSchema = z.object({
  time: timeOfDaySchema,
  spaceId: z.string(),
  spaceName: z.string(),
  className: z.string().optional(),
  activity: z.string(),
  reason: z.string(),
})
export type DayPlanStopView = z.infer<typeof dayPlanStopViewSchema>

/** A plan ready to display: space names and the plan's price resolved from club data. */
export const dayPlanViewSchema = z.object({
  /** Public id of the stored plan; absent if it could not be saved. */
  id: z.string().optional(),
  clubName: z.string(),
  day: z.enum(weekdays),
  summary: z.string(),
  stops: z.array(dayPlanStopViewSchema),
  recommendedPlan: z
    .object({
      name: z.string(),
      pricePerMonth: z.string(),
      joiningFee: z.string().optional(),
    })
    .optional(),
  caveats: z.array(z.string()),
})
export type DayPlanView = z.infer<typeof dayPlanViewSchema>

export const conciergeResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('planned'), plan: dayPlanViewSchema }),
  z.object({ status: z.enum(['refusal', 'failed', 'unavailable']), message: z.string() }),
])
export type ConciergeResponse = z.infer<typeof conciergeResponseSchema>

export const REFUSAL_MESSAGE =
  'I can only help plan a visit to the club. Tell us a little about your week (how you like to train, work or unwind) and we’ll suggest a day.'

export const FAILED_MESSAGE =
  'We couldn’t put together a plan that fits the club’s timetable just now. Please try again, or book a tour and the team will plan it with you.'

export const UNAVAILABLE_MESSAGE =
  'Day planning isn’t available right now. Please try again later, or book a tour and the team will plan your first day with you.'

/** Added whenever the visitor mentions an injury, pain or a health condition. */
export const HEALTH_CAVEAT =
  'If you have an injury or a health condition, check with a GP or physiotherapist before trying anything new. The team can help you adapt classes, but they can’t give medical advice.'
