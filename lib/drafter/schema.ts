import { z } from 'zod'

export const tones = ['calm', 'energetic', 'premium'] as const
export type Tone = (typeof tones)[number]

export const BRIEF_MAX_LENGTH = 1000

export const draftRequestSchema = z.object({
  clubId: z.string({ error: 'Choose a club' }).trim().min(1, { error: 'Choose a club' }).max(100),
  brief: z
    .string({ error: 'Write a brief' })
    .trim()
    .min(20, { error: 'Write a brief of at least 20 characters' })
    .max(BRIEF_MAX_LENGTH, { error: `Keep the brief to ${BRIEF_MAX_LENGTH} characters or fewer` }),
  tone: z.enum(tones, { error: 'Choose a tone' }),
})
export type DraftRequest = z.infer<typeof draftRequestSchema>

const line = (max: number) => z.string().trim().min(1).max(max)

/** A plain number from the club's facts, or a [[PRICE: ...]] placeholder. */
const price = z
  .string()
  .trim()
  .regex(/^(\d+(\.\d{1,2})?|\[\[PRICE:[^\]]+\]\])$/, {
    error: 'Use a plain number or a [[PRICE: ...]] placeholder',
  })

/**
 * What the model must return: one strict object per block type (the six
 * blocks of docs/SPEC.md §3). The server turns it into the ordered blocks array.
 */
export const draftOutputSchema = z.strictObject({
  title: line(100),
  seo: z.strictObject({ title: line(70), description: line(170) }),
  hero: z.strictObject({
    eyebrow: line(80),
    heading: line(120),
    subheading: line(320),
    ctaLabel: line(40),
  }),
  facilities: z.strictObject({ heading: line(80), intro: line(320) }),
  spaRecovery: z.strictObject({
    eyebrow: line(40),
    heading: line(80),
    intro: line(320),
    items: z
      .array(z.strictObject({ name: line(60), description: line(260) }))
      .min(1)
      .max(4),
  }),
  rates: z.strictObject({
    heading: line(80),
    plans: z
      .array(
        z.strictObject({
          name: line(60),
          pricePerMonth: price,
          joiningFee: price,
          inclusions: z.array(line(90)).min(1).max(6),
        }),
      )
      .min(1)
      .max(4),
    note: line(260),
  }),
  tourBooking: z.strictObject({ heading: line(80), intro: line(320) }),
  faq: z.strictObject({ heading: line(80), intro: line(260) }),
})
export type DraftOutput = z.infer<typeof draftOutputSchema>
