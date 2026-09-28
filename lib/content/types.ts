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

export const dayPeriods = ['morning', 'midday', 'evening', 'night'] as const

/** Hero wording for one time of day; anything left empty falls back to the default. */
export const heroPeriodVariantSchema = z.object({
  period: z.enum(dayPeriods),
  eyebrow: opt(z.string()),
  subheading: opt(z.string()),
  /** Label for the link to the section highlighted at this time of day. */
  highlightLabel: opt(z.string()),
})
export type HeroPeriodVariant = z.infer<typeof heroPeriodVariantSchema>

export const heroBlockSchema = z.object({
  _type: z.literal('heroBlock'),
  ...keyed,
  eyebrow: opt(z.string()),
  heading: z.string(),
  subheading: opt(z.string()),
  image: optionalImage,
  primaryCta: opt(ctaSchema),
  periodVariants: list(heroPeriodVariantSchema),
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

export const busynessBlockSchema = z.object({
  _type: z.literal('busynessBlock'),
  ...keyed,
  eyebrow: opt(z.string()),
  heading: z.string(),
  intro: opt(z.string()),
})

export const clubMapBlockSchema = z.object({
  _type: z.literal('clubMapBlock'),
  ...keyed,
  eyebrow: opt(z.string()),
  heading: z.string(),
  intro: opt(z.string()),
})

export const calculatorBlockSchema = z.object({
  _type: z.literal('calculatorBlock'),
  ...keyed,
  eyebrow: opt(z.string()),
  heading: z.string(),
  intro: opt(z.string()),
  /** Shown beside the comparison, e.g. "Typical London prices, for comparison". */
  comparisonLabel: opt(z.string()),
})

export const conciergeBlockSchema = z.object({
  _type: z.literal('conciergeBlock'),
  ...keyed,
  eyebrow: opt(z.string()),
  heading: z.string(),
  intro: opt(z.string()),
  /** Optional quick answers, e.g. "I work from home". */
  chips: list(z.string()),
})

export const pageBlockSchema = z.discriminatedUnion('_type', [
  heroBlockSchema,
  facilitiesBlockSchema,
  spaRecoveryBlockSchema,
  ratesBlockSchema,
  tourBookingBlockSchema,
  faqBlockSchema,
  conciergeBlockSchema,
  calculatorBlockSchema,
  clubMapBlockSchema,
  busynessBlockSchema,
])

export type HeroBlockData = z.infer<typeof heroBlockSchema>
export type FacilitiesBlockData = z.infer<typeof facilitiesBlockSchema>
export type SpaRecoveryBlockData = z.infer<typeof spaRecoveryBlockSchema>
export type SpaRecoveryItem = z.infer<typeof spaRecoveryItemSchema>
export type RatesBlockData = z.infer<typeof ratesBlockSchema>
export type TourBookingBlockData = z.infer<typeof tourBookingBlockSchema>
export type FaqBlockData = z.infer<typeof faqBlockSchema>
export type ConciergeBlockData = z.infer<typeof conciergeBlockSchema>
export type CalculatorBlockData = z.infer<typeof calculatorBlockSchema>
export type ClubMapBlockData = z.infer<typeof clubMapBlockSchema>
export type BusynessBlockData = z.infer<typeof busynessBlockSchema>
export type PageBlock = z.infer<typeof pageBlockSchema>
export type PageBlockType = PageBlock['_type']

/** The things a member might otherwise pay for one by one. */
export const usages = ['gym', 'classes', 'spa', 'recovery', 'cowork'] as const
export type Usage = (typeof usages)[number]

/** A typical local price for paying separately, used by the cost calculator. */
export const comparisonItemSchema = z.object({
  usage: z.enum(usages),
  label: z.string(),
  unitPrice: z.number().nonnegative(),
  /** What one unit is, e.g. "visit", "class", "day". */
  unit: z.string(),
  note: opt(z.string()),
})
export type ComparisonItem = z.infer<typeof comparisonItemSchema>

export const marketSchema = z.object({
  code: z.string(),
  name: z.string(),
  locale: z.string(),
  currency: z.string(),
  comparisonItems: list(comparisonItemSchema),
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

/** 24-hour "HH:MM". */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

/** A bookable or usable space in the club, referenced by the schedule and day plans. */
export const spaceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  category: z.enum(facilityCategories),
  description: opt(z.string()),
  typicalUses: list(z.string()),
  /** Overrides the club's hours for this space; empty means the club's hours. */
  openingHours: list(openingHoursSchema),
})
export type Space = z.infer<typeof spaceSchema>

export const intensities = ['low', 'medium', 'high'] as const
export type Intensity = (typeof intensities)[number]

/** One class in the sample weekly timetable. */
export const scheduleEntrySchema = z.object({
  day: z.enum(weekdays),
  time: timeOfDaySchema,
  name: z.string(),
  spaceId: z.string(),
  durationMin: z.number().int().positive(),
  intensity: z.enum(intensities),
})
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>

/**
 * Geometry for one area of an illustrated floor plan, in the map's viewBox
 * units: a rectangle (x, y, w, h) or a polygon ("x,y x,y …").
 */
const mapShapeFields = {
  shape: z.enum(['rect', 'polygon']),
  x: opt(z.number()),
  y: opt(z.number()),
  w: opt(z.number()),
  h: opt(z.number()),
  points: opt(z.string()),
  /** Where the label sits; defaults to the shape's centre. */
  labelX: opt(z.number()),
  labelY: opt(z.number()),
}

/** A selectable area of the map, tied to one of the club's spaces. */
export const mapZoneSchema = z.object({
  spaceId: z.string(),
  /** Defaults to the space's name. */
  label: opt(z.string()),
  ...mapShapeFields,
})
export type MapZone = z.infer<typeof mapZoneSchema>

/** A decorative, non-interactive area such as a garden or the entrance. */
export const mapFeatureSchema = z.object({
  kind: z.enum(['garden', 'entrance', 'other']),
  label: opt(z.string()),
  ...mapShapeFields,
})
export type MapFeature = z.infer<typeof mapFeatureSchema>

export const mapFloorSchema = z.object({
  name: z.string(),
  zones: list(mapZoneSchema),
  features: list(mapFeatureSchema),
})
export type MapFloor = z.infer<typeof mapFloorSchema>

/** An illustrative, invented floor plan: never a real architect's drawing. */
export const clubMapSchema = z.object({
  viewBox: z.string().regex(/^\d+ \d+ \d+ \d+$/),
  floors: list(mapFloorSchema),
})
export type ClubMap = z.infer<typeof clubMapSchema>

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
  spaces: list(spaceSchema),
  schedule: list(scheduleEntrySchema),
  /** IANA time zone for opening hours and the timetable. */
  timeZone: z.preprocess((v) => v ?? 'Europe/London', z.string()),
  clubMap: opt(clubMapSchema),
  facts: list(factSchema),
  seo: opt(seoSchema),
})
export type Club = z.infer<typeof clubSchema>

/** One stop in a visitor's planned first day. */
export const dayPlanStopSchema = z.object({
  time: timeOfDaySchema,
  spaceId: z.string(),
  /** Set when the stop is a scheduled class. */
  className: opt(z.string()),
  activity: z.string(),
  reason: z.string(),
})
export type DayPlanStop = z.infer<typeof dayPlanStopSchema>

/**
 * A stored first-day plan. Holds the structured plan only: the visitor's own
 * words are never stored.
 */
export const dayPlanSchema = z.object({
  publicId: z.string(),
  clubId: z.string(),
  day: z.enum(weekdays),
  summary: z.string(),
  stops: list(dayPlanStopSchema),
  recommendedPlanName: opt(z.string()),
  caveats: list(z.string()),
  /** Which of the block's quick options were chosen. */
  chips: list(z.string()),
  createdAt: opt(z.string()),
})
export type DayPlan = z.infer<typeof dayPlanSchema>

export const faqStatuses = ['approved', 'pending', 'rejected'] as const
export type FaqStatus = (typeof faqStatuses)[number]

export const publicFaqSchema = z.object({
  _id: z.string(),
  question: z.string(),
  answer: z.string(),
})
export type PublicFaq = z.infer<typeof publicFaqSchema>

/**
 * A malformed or unknown block is dropped (and logged) rather than taking the
 * whole page down: editors may be mid-way through adding a new block type.
 */
const lenientBlocks = z
  .preprocess((v) => v ?? [], z.array(z.unknown()))
  .transform((items) =>
    items.flatMap((item) => {
      const parsed = pageBlockSchema.safeParse(item)
      if (parsed.success) return [parsed.data]
      const type = (item as { _type?: unknown } | null)?._type
      console.warn(`Skipping invalid block "${String(type)}": ${parsed.error.issues[0]?.message}`)
      return []
    }),
  )

export const clubPageSchema = z.object({
  _id: z.string(),
  title: z.string(),
  seo: opt(seoSchema),
  club: clubSchema,
  blocks: lenientBlocks,
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
