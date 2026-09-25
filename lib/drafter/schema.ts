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

// Hard limits are generous so a slightly long line doesn't fail the whole
// draft; the target lengths go to the model as field descriptions.
const line = (max: number, guidance?: string) => {
  const schema = z.string().trim().min(1).max(max)
  return guidance ? schema.describe(guidance) : schema
}

/** A plain number from the club's facts, or a [[PRICE: ...]] placeholder. */
const price = z
  .string()
  .trim()
  .regex(/^(\d+(\.\d{1,2})?|\[\[\s*PRICE\s*:[^\]]+\]\])$/i, {
    error: 'Use a plain number or a [[PRICE: ...]] placeholder',
  })
  .describe(
    'A plain number taken from the club facts, such as "245", or a placeholder such as "[[PRICE: founding monthly membership]]".',
  )

/**
 * What the model must return: one strict object per block type (the six
 * blocks of docs/SPEC.md §3). The server turns it into the ordered blocks array.
 */
export const draftOutputSchema = z.strictObject({
  title: line(120, 'The page title, usually the club name.'),
  seo: z.strictObject({
    title: line(100, 'Search result title, under 60 characters.'),
    description: line(240, 'Search result description, under 155 characters.'),
  }),
  hero: z.strictObject({
    eyebrow: line(100, 'A short label above the heading, under 40 characters.'),
    heading: line(160, 'The page headline, under eight words.'),
    subheading: line(500, 'One or two sentences.'),
    ctaLabel: line(60, 'Button text inviting a tour, two to four words.'),
  }),
  facilities: z.strictObject({
    heading: line(100, 'Under six words.'),
    intro: line(500, 'One or two sentences.'),
  }),
  spaRecovery: z.strictObject({
    eyebrow: line(60, 'A one- or two-word label, for example "The garden".'),
    heading: line(100, 'Under six words.'),
    intro: line(500, 'One or two sentences.'),
    items: z
      .array(
        z.strictObject({
          name: line(80, 'A spa or recovery facility from the club facts.'),
          description: line(400, 'One or two sentences.'),
        }),
      )
      .min(1)
      .max(4),
  }),
  rates: z.strictObject({
    heading: line(100, 'Under five words.'),
    plans: z
      .array(
        z.strictObject({
          name: line(80, 'Membership name.'),
          pricePerMonth: price,
          joiningFee: price,
          inclusions: z.array(line(120, 'A short phrase.')).min(1).max(8),
        }),
      )
      .min(1)
      .max(4),
    note: line(400, 'One sentence of small print.'),
  }),
  tourBooking: z.strictObject({
    heading: line(100, 'Under six words.'),
    intro: line(500, 'One or two sentences.'),
  }),
  faq: z.strictObject({
    heading: line(100, 'Under five words.'),
    intro: line(400, 'One sentence.'),
  }),
})
export type DraftOutput = z.infer<typeof draftOutputSchema>
