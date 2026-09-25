import { normalizeQuestion } from '@/lib/faq/normalize'
import { demoClubs, demoFaqs, demoPages, type DemoFaq } from './demo-data'
import type { ContentRepository, DraftClubPage } from './repository'
import {
  clubPageSchema,
  clubPageSummarySchema,
  type Club,
  type ClubPageData,
  type ClubPageSummary,
} from './types'

type DemoStore = {
  faqs: DemoFaq[]
  drafts: Array<DraftClubPage & { _id: string }>
}

// Shared across route bundles in one server process (Next.js may load this
// module more than once). Resets on restart, which is what demo mode wants.
const globalStore = globalThis as typeof globalThis & { __clubLaunchDemoStore?: DemoStore }

function store(): DemoStore {
  globalStore.__clubLaunchDemoStore ??= { faqs: structuredClone(demoFaqs), drafts: [] }
  return globalStore.__clubLaunchDemoStore
}

/** Test helper: restore the demo store to its seeded state. */
export function resetDemoStore(): void {
  delete globalStore.__clubLaunchDemoStore
}

function clubById(id: string): Club | undefined {
  return demoClubs.find((c) => c._id === id)
}

export const demoRepository: ContentRepository = {
  kind: 'demo',

  async listClubPages(): Promise<ClubPageSummary[]> {
    return demoPages.flatMap((page) => {
      const club = clubById(page.clubId)
      if (!club) return []
      const hero = page.blocks.find((b) => b._type === 'heroBlock')
      return [
        clubPageSummarySchema.parse({
          title: page.title,
          clubName: club.name,
          slug: club.slug,
          market: club.market.code,
          status: club.status,
          tier: club.tier,
          locality: club.address.locality,
          summary: page.seo?.description ?? hero?.subheading,
          image: hero?.image,
          updatedAt: page.updatedAt,
        }),
      ]
    })
  },

  async getClubPage(market, slug): Promise<ClubPageData | null> {
    const club = demoClubs.find((c) => c.slug === slug && c.market.code === market)
    const page = club && demoPages.find((p) => p.clubId === club._id)
    if (!club || !page) return null
    const faqs = store()
      .faqs.filter((f) => f.clubId === club._id && f.status === 'approved')
      .sort((a, b) => b.askedCount - a.askedCount)
      .map(({ _id, question, answer }) => ({ _id, question, answer }))
    return clubPageSchema.parse({
      _id: page._id,
      title: page.title,
      seo: page.seo,
      club,
      blocks: page.blocks,
      faqs,
    })
  },

  async getClubBySlug(slug) {
    return demoClubs.find((c) => c.slug === slug) ?? null
  },

  async getClubById(id) {
    return clubById(id) ?? null
  },

  async getApprovedFaqs(clubId) {
    return store()
      .faqs.filter((f) => f.clubId === clubId && f.status === 'approved')
      .map(({ question, answer }) => ({ question, answer }))
  },

  async findFaqMatch(clubId, normalizedQuestion) {
    const match = store().faqs.find(
      (f) =>
        f.clubId === clubId &&
        f.status !== 'rejected' &&
        normalizeQuestion(f.question) === normalizedQuestion,
    )
    if (!match || match.status === 'rejected') return null
    return { _id: match._id, question: match.question, answer: match.answer, status: match.status }
  },

  async incrementFaqAskedCount(id) {
    const faq = store().faqs.find((f) => f._id === id)
    if (faq) faq.askedCount += 1
  },

  async createPendingFaq(input) {
    const id = `faq-demo-${crypto.randomUUID()}`
    store().faqs.push({
      _id: id,
      clubId: input.clubId,
      question: input.question,
      answer: input.answer,
      status: 'pending',
      source: 'ai',
      askedCount: 1,
    })
    return { id }
  },

  async listClubsWithoutPage() {
    const withPage = new Set([
      ...demoPages.map((p) => p.clubId),
      ...store().drafts.map((d) => d.clubId),
    ])
    return demoClubs
      .filter((c) => !withPage.has(c._id))
      .map(({ _id, name, slug }) => ({ _id, name, slug }))
  },

  async createDraftClubPage(input) {
    const id = `drafts.clubPage-demo-${crypto.randomUUID()}`
    store().drafts.push({ ...input, _id: id })
    return { id }
  },
}
