import 'server-only'
import { z } from 'zod'
import { normalizeQuestion } from '@/lib/faq/normalize'
import { getReadClient, getWriteClient } from '@/lib/sanity/client'
import {
  APPROVED_FAQS_QUERY,
  CLUB_BY_ID_QUERY,
  CLUB_BY_SLUG_QUERY,
  CLUB_PAGE_QUERY,
  CLUB_PAGES_QUERY,
  CLUBS_WITH_PAGE_STATE_QUERY,
  FAQ_CANDIDATES_QUERY,
} from '@/lib/sanity/queries'
import type { ContentRepository } from './repository'
import { clubPageTags, TYPE_TAGS } from './tags'
import { clubPageSchema, clubPageSummarySchema, clubSchema, faqStatuses } from './types'

/** Cached until a webhook expires one of the tags. */
function published<T>(query: string, params: Record<string, unknown>, tags: string[]) {
  return getReadClient().fetch<T>(query, params, { cache: 'force-cache', next: { tags } })
}

/** Uncached, for the FAQ cache lookup and the drafter. */
function fresh<T>(query: string, params: Record<string, unknown> = {}) {
  return getReadClient().fetch<T>(query, params, { cache: 'no-store' })
}

const faqCandidateSchema = z.object({
  _id: z.string(),
  question: z.string(),
  answer: z.string(),
  status: z.enum(faqStatuses),
  normalizedQuestion: z.string().nullish(),
})

const pageStateSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  hasPage: z.boolean(),
})

export const sanityRepository: ContentRepository = {
  kind: 'sanity',

  async listClubPages() {
    const rows = await published<unknown[]>(CLUB_PAGES_QUERY, {}, [...TYPE_TAGS])
    return z.array(clubPageSummarySchema).parse(rows ?? [])
  },

  async getClubPage(market, slug, options) {
    const params = { market, slug }
    const raw = options?.preview
      ? await getReadClient()
          .withConfig({ perspective: 'drafts' })
          .fetch<unknown>(CLUB_PAGE_QUERY, params, { cache: 'no-store' })
      : await published<unknown>(CLUB_PAGE_QUERY, params, clubPageTags(slug))
    return raw ? clubPageSchema.parse(raw) : null
  },

  async getClubBySlug(slug) {
    const raw = await fresh<unknown>(CLUB_BY_SLUG_QUERY, { slug })
    return raw ? clubSchema.parse(raw) : null
  },

  async getClubById(id) {
    const raw = await fresh<unknown>(CLUB_BY_ID_QUERY, { id })
    return raw ? clubSchema.parse(raw) : null
  },

  async getApprovedFaqs(clubId) {
    const rows = await fresh<unknown[]>(APPROVED_FAQS_QUERY, { clubId })
    return z.array(z.object({ question: z.string(), answer: z.string() })).parse(rows ?? [])
  },

  async findFaqMatch(clubId, normalizedQuestion) {
    const rows = z
      .array(faqCandidateSchema)
      .parse((await fresh<unknown[]>(FAQ_CANDIDATES_QUERY, { clubId })) ?? [])
    // Editor-written items may lack normalizedQuestion, so normalise here too.
    const match = rows.find(
      (row) =>
        row.normalizedQuestion === normalizedQuestion ||
        normalizeQuestion(row.question) === normalizedQuestion,
    )
    if (!match || match.status === 'rejected') return null
    return { _id: match._id, question: match.question, answer: match.answer, status: match.status }
  },

  async incrementFaqAskedCount(id) {
    await getWriteClient().patch(id).setIfMissing({ askedCount: 0 }).inc({ askedCount: 1 }).commit()
  },

  async createPendingFaq(input) {
    const doc = await getWriteClient().create({
      _type: 'faqItem',
      club: { _type: 'reference', _ref: input.clubId },
      question: input.question,
      answer: input.answer,
      normalizedQuestion: input.normalizedQuestion,
      source: 'ai',
      status: 'pending',
      askedCount: 1,
    })
    return { id: doc._id }
  },

  async listClubsWithoutPage() {
    const rows = await getWriteClient().fetch<unknown[]>(
      CLUBS_WITH_PAGE_STATE_QUERY,
      {},
      { cache: 'no-store' },
    )
    return z
      .array(pageStateSchema)
      .parse(rows ?? [])
      .filter((row) => !row.hasPage)
      .map(({ _id, name, slug }) => ({ _id, name, slug }))
  },

  async createDraftClubPage(input) {
    // The "drafts." prefix makes this an unpublished draft; nothing here publishes.
    const doc = await getWriteClient().create({
      _id: `drafts.${crypto.randomUUID()}`,
      _type: 'clubPage',
      club: { _type: 'reference', _ref: input.clubId },
      title: input.title,
      seo: input.seo,
      blocks: input.blocks,
    })
    return { id: doc._id }
  },
}
