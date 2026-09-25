import { z } from 'zod'

// View models consumed by components. Sanity query results and demo data are
// both parsed through these schemas, so components never see raw CMS shapes.

/** Sanity returns null for missing fields; components want an optional key. */
const opt = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === null ? undefined : v), schema.optional())

/** Missing or null arrays become []. */
const list = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === null || v === undefined ? [] : v), z.array(schema))

export const facilityCategories = [
  'gym',
  'spa',
  'recovery',
  'pool',
  'cowork',
  'studio',
  'food',
] as const
export type FacilityCategory = (typeof facilityCategories)[number]

export const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const
export type Weekday = (typeof weekdays)[number]

export const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  width: opt(z.number()),
  height: opt(z.number()),
  lqip: opt(z.string()),
})
export type ImageData = z.infer<typeof imageSchema>

/** An image whose asset or alt text is missing renders as "no image". */
const optionalImage = z
  .unknown()
  .transform((v) => {
    const parsed = imageSchema.safeParse(v)
    return parsed.success ? parsed.data : undefined
  })
  .optional()

export const ctaSchema = z.object({
  label: z.string().min(1),
  target: z.enum(['tour', 'faq', 'url']),
  url: opt(z.string()),
})
export type Cta = z.infer<typeof ctaSchema>

export const facilitySchema = z.object({
  name: z.string().min(1),
  category: z.enum(facilityCategories),
  description: opt(z.string()),
})
export type Facility = z.infer<typeof facilitySchema>

const keyed = { _key: z.string() }

export const heroBlockSchema = z.object({
  _type: z.literal('heroBlock'),
  ...keyed,
  eyebrow: opt(z.string()),
  heading: z.string(),
  subheading: opt(z.string()),
  image: optionalImage,
  primaryCta: opt(ctaSchema),
})

export const facilitiesBlockSchema = z.object({
  _type: z.literal('facilitiesBlock'),
  ...keyed,
  heading: z.string(),
  intro: opt(z.string()),
  facilities: opt(z.array(facilitySchema)),
})

export const spaRecoveryItemSchema = z.object({
  ...keyed,
  name: z.string(),
  description: z.string(),
  image: optionalImage,
})

export const spaRecoveryBlockSchema = z.object({
  _type: z.literal('spaRecoveryBlock'),
  ...keyed,
  eyebrow: opt(z.string()),
  heading: z.string(),
  intro: opt(z.string()),
  items: list(spaRecoveryItemSchema),
})

export const ratePlanSchema = z.object({
  ...keyed,
  name: z.string(),
  /** Numeric string ("245") or a [[PRICE: ...]] placeholder in unpublished drafts. */
  pricePerMonth: z.string(),
  joiningFee: opt(z.string()),
  inclusions: list(z.string()),
})
export type RatePlan = z.infer<typeof ratePlanSchema>

export const ratesBlockSchema = z.object({
  _type: z.literal('ratesBlock'),
  ...keyed,
  heading: z.string(),
  plans: list(ratePlanSchema),
  note: opt(z.string()),
})

export const tourBookingBlockSchema = z.object({
  _type: z.literal('tourBookingBlock'),
  ...keyed,
  heading: z.string(),
  intro: opt(z.string()),
})

export const faqBlockSchema = z.object({
  _type: z.literal('faqBlock'),
  ...keyed,
  heading: z.string(),
  intro: opt(z.string()),
  allowQuestions: z.preprocess((v) => v ?? false, z.boolean()),
})

export const pageBlockSchema = z.discriminatedUnion('_type', [
  heroBlockSchema,
  facilitiesBlockSchema,
  spaRecoveryBlockSchema,
  ratesBlockSchema,
  tourBookingBlockSchema,
  faqBlockSchema,
])

export type HeroBlockData = z.infer<typeof heroBlockSchema>
export type FacilitiesBlockData = z.infer<typeof facilitiesBlockSchema>
export type SpaRecoveryBlockData = z.infer<typeof spaRecoveryBlockSchema>
export type SpaRecoveryItem = z.infer<typeof spaRecoveryItemSchema>
export type RatesBlockData = z.infer<typeof ratesBlockSchema>
export type TourBookingBlockData = z.infer<typeof tourBookingBlockSchema>
export type FaqBlockData = z.infer<typeof faqBlockSchema>
export type PageBlock = z.infer<typeof pageBlockSchema>
export type PageBlockType = PageBlock['_type']

export const marketSchema = z.object({
  code: z.string(),
  name: z.string(),
  locale: z.string(),
  currency: z.string(),
})
export type Market = z.infer<typeof marketSchema>

export const openingHoursSchema = z.object({
  day: z.enum(weekdays),
  opens: z.string(),
  closes: z.string(),
})
export type OpeningHours = z.infer<typeof openingHoursSchema>

export const factSchema = z.object({ label: z.string(), value: z.string() })
export type Fact = z.infer<typeof factSchema>

export const seoSchema = z.object({
  title: opt(z.string()),
  description: opt(z.string()),
})
export type Seo = z.infer<typeof seoSchema>

export const addressSchema = z.object({
  streetAddress: z.string(),
  locality: z.string(),
  postalCode: z.string(),
  country: z.string(),
})
export type Address = z.infer<typeof addressSchema>

export const clubSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  market: marketSchema,
  tier: z.enum(['standard', 'social-wellness']),
  status: z.enum(['open', 'coming-soon']),
  address: addressSchema,
  geo: opt(z.object({ lat: z.number(), lng: z.number() })),
  openingHours: list(openingHoursSchema),
  phone: opt(z.string()),
  facilities: list(facilitySchema),
  facts: list(factSchema),
  seo: opt(seoSchema),
})
export type Club = z.infer<typeof clubSchema>

export const faqStatuses = ['approved', 'pending', 'rejected'] as const
export type FaqStatus = (typeof faqStatuses)[number]

export const publicFaqSchema = z.object({
  _id: z.string(),
  question: z.string(),
  answer: z.string(),
})
export type PublicFaq = z.infer<typeof publicFaqSchema>

export const clubPageSchema = z.object({
  _id: z.string(),
  title: z.string(),
  seo: opt(seoSchema),
  club: clubSchema,
  blocks: list(pageBlockSchema),
  faqs: list(publicFaqSchema),
})
export type ClubPageData = z.infer<typeof clubPageSchema>

export const clubPageSummarySchema = z.object({
  title: z.string(),
  clubName: z.string(),
  slug: z.string(),
  market: z.string(),
  status: z.enum(['open', 'coming-soon']),
  tier: z.enum(['standard', 'social-wellness']),
  locality: opt(z.string()),
  summary: opt(z.string()),
  image: optionalImage,
  updatedAt: opt(z.string()),
})
export type ClubPageSummary = z.infer<typeof clubPageSummarySchema>

export const clubOptionSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
})
export type ClubOption = z.infer<typeof clubOptionSchema>

export function clubPath(market: string, slug: string): string {
  return `/${market}/clubs/${slug}`
}
