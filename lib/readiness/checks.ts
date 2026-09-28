import { isNumeric } from '../format'
import { findPlaceholders, placeholderSummary } from '../placeholders'

// Launch readiness for a club page: a checklist a page must pass before it can
// be published. Works on raw Sanity documents (as the Studio sees them), so
// the same rules drive the publish gate, the badge and the Studio tool.

export const MIN_APPROVED_FAQS = 5
export const SEO_TITLE_LENGTH = { min: 10, max: 60 }
export const SEO_DESCRIPTION_LENGTH = { min: 50, max: 160 }

export type CheckId = 'placeholders' | 'images' | 'seo' | 'hours' | 'joiningFee' | 'tour' | 'faqs'

export type ReadinessCheck = { id: CheckId; label: string; ok: boolean; problems: string[] }

type Seo = { title?: string; description?: string } | null | undefined
type RawBlock = { _type?: string; heading?: string; [key: string]: unknown }

export type ReadinessInput = {
  page: { title?: string; seo?: Seo; blocks?: RawBlock[] | null }
  club?: {
    openingHours?: Array<{ day?: string; opens?: string; closes?: string }> | null
    seo?: Seo
  } | null
  approvedFaqCount: number
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const blockName: Record<string, string> = {
  heroBlock: 'Hero',
  spaRecoveryBlock: 'Spa and recovery',
  facilitiesBlock: 'Facilities',
  ratesBlock: 'Membership',
}

/** Images anywhere in a block: objects with an uploaded asset. */
function imagesIn(value: unknown): Array<{ alt?: unknown }> {
  if (Array.isArray(value)) return value.flatMap(imagesIn)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const own = record.asset ? [record as { alt?: unknown }] : []
    return [...own, ...Object.values(record).flatMap(imagesIn)]
  }
  return []
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function readinessChecks({
  page,
  club,
  approvedFaqCount,
}: ReadinessInput): ReadinessCheck[] {
  const blocks = page.blocks ?? []
  const check = (id: CheckId, label: string, problems: string[]): ReadinessCheck => ({
    id,
    label,
    ok: problems.length === 0,
    problems,
  })

  const placeholders = findPlaceholders(page)
  const unique = new Set(placeholders.map((p) => p.raw)).size

  const missingAlt = blocks.flatMap((block, index) =>
    imagesIn(block)
      .filter((image) => typeof image.alt !== 'string' || image.alt.trim() === '')
      .map(
        () =>
          `Add alt text to the image in block ${index + 1} (${blockName[block._type ?? ''] ?? block._type})`,
      ),
  )

  const seoTitle = (page.seo?.title || club?.seo?.title || '').trim()
  const seoDescription = (page.seo?.description || club?.seo?.description || '').trim()
  const seoProblems: string[] = []
  if (!seoTitle) seoProblems.push('Add an SEO title')
  else if (seoTitle.length > SEO_TITLE_LENGTH.max)
    seoProblems.push(
      `Shorten the SEO title to ${SEO_TITLE_LENGTH.max} characters (it has ${seoTitle.length})`,
    )
  else if (seoTitle.length < SEO_TITLE_LENGTH.min)
    seoProblems.push(`Lengthen the SEO title to at least ${SEO_TITLE_LENGTH.min} characters`)
  if (!seoDescription) seoProblems.push('Add an SEO description')
  else if (seoDescription.length > SEO_DESCRIPTION_LENGTH.max)
    seoProblems.push(
      `Shorten the SEO description to ${SEO_DESCRIPTION_LENGTH.max} characters (it has ${seoDescription.length})`,
    )
  else if (seoDescription.length < SEO_DESCRIPTION_LENGTH.min)
    seoProblems.push(
      `Lengthen the SEO description to at least ${SEO_DESCRIPTION_LENGTH.min} characters`,
    )

  const hours = club?.openingHours ?? []
  const hourProblems: string[] = []
  if (hours.length === 0) hourProblems.push('Add the club’s opening hours')
  const seenDays = new Set<string>()
  for (const entry of hours) {
    const day = entry.day ?? '(no day)'
    if (!entry.day || !WEEKDAYS.includes(entry.day)) hourProblems.push(`Choose a day for "${day}"`)
    else if (seenDays.has(entry.day)) hourProblems.push(`${entry.day} is listed twice`)
    seenDays.add(entry.day ?? '')
    if (!entry.opens || !entry.closes || !TIME.test(entry.opens) || !TIME.test(entry.closes))
      hourProblems.push(`Use 24-hour times like 06:00 for ${day}`)
    else if (entry.opens >= entry.closes) hourProblems.push(`${day} closes before it opens`)
  }

  const plans = blocks
    .filter((block) => block._type === 'ratesBlock')
    .flatMap(
      (block) => (block.plans as Array<{ name?: string; joiningFee?: string }> | undefined) ?? [],
    )
  const feeProblems = plans
    .filter((plan) => !plan.joiningFee || !isNumeric(plan.joiningFee))
    .map((plan) => `Add the joining fee to "${plan.name ?? 'a plan'}"`)

  return [
    check(
      'placeholders',
      'No placeholders left',
      unique
        ? [`Replace ${plural(unique, 'placeholder')}: ${placeholderSummary(placeholders)}`]
        : [],
    ),
    check('images', 'Every image has alt text', missingAlt),
    check('seo', 'SEO title and description', seoProblems),
    check('hours', 'Opening hours are valid', hourProblems),
    check('joiningFee', 'Joining fee shown with every price', feeProblems),
    check(
      'tour',
      'Tour booking form on the page',
      blocks.some((b) => b._type === 'tourBookingBlock') ? [] : ['Add a tour booking block'],
    ),
    check(
      'faqs',
      `At least ${MIN_APPROVED_FAQS} approved FAQs`,
      approvedFaqCount >= MIN_APPROVED_FAQS
        ? []
        : [`Approve at least ${MIN_APPROVED_FAQS} FAQs for this club (${approvedFaqCount} so far)`],
    ),
  ]
}

/** Share of checks passed, 0–100. */
export function readinessScore(checks: ReadinessCheck[]): number {
  return Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)
}
