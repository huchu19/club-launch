import { normalizeQuestion } from '@/lib/faq/normalize'
import { demoClubs, demoFaqs, demoPages, MAYFAIR_ID, type DemoFaq } from './demo-data'
import type { ContentRepository, DraftClubPage } from './repository'
import {
  clubPageSchema,
  clubPageSummarySchema,
  dayPlanSchema,
  type Club,
  type ClubPageData,
  type ClubPageSummary,
  type DayPlan,
  type QuestionRecord,
} from './types'

type DemoStore = {
  faqs: DemoFaq[]
  drafts: Array<DraftClubPage & { _id: string }>
  dayPlans: DayPlan[]
}

const SEEDED_AT = '2026-09-20T09:00:00Z'
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

/**
 * A little visitor history for the insights page in demo mode: questions the
 * FAQ assistant has fielded (some near-duplicates, one it couldn't answer) and
 * a few first-day plans. Demo-only; never written to Sanity by the seed.
 */
function demoHistory(): { faqs: DemoFaq[]; dayPlans: DayPlan[] } {
  const ai = (id: string, question: string, answer: string, askedCount: number, days: number) => ({
    _id: `faq-demo-${id}`,
    clubId: MAYFAIR_ID,
    question,
    answer,
    status: 'pending' as const,
    source: 'ai' as const,
    askedCount,
    createdAt: daysAgo(days),
  })
  const refusal =
    'I’m sorry, I can’t answer that from the information I have about Linden Mayfair. The team will be happy to help: book a tour or contact the club directly.'
  const plan = (
    id: string,
    day: DayPlan['day'],
    chips: string[],
    caveats: string[],
    days: number,
  ) => ({
    publicId: `demoplan${id}00000000`.slice(0, 16),
    clubId: MAYFAIR_ID,
    day,
    summary: `A ${day} at Linden Mayfair.`,
    stops: [
      {
        time: '08:00',
        spaceId: 'movement-studio',
        activity: 'A morning class',
        reason: 'You start well.',
      },
      { time: '13:00', spaceId: 'garden-kitchen', activity: 'Lunch', reason: 'You pause.' },
      { time: '18:30', spaceId: 'thermal-suite', activity: 'Thermal suite', reason: 'You unwind.' },
    ],
    recommendedPlanName: 'Club',
    caveats,
    chips,
    createdAt: daysAgo(days),
  })
  const health =
    'If you have an injury or a health condition, check with a GP or physiotherapist before trying anything new.'
  return {
    faqs: [
      ai('steam', 'Do you have a steam room?', 'Yes, the thermal suite has a steam room.', 6, 2),
      ai(
        'steam-2',
        'Is there a steam room in the spa?',
        'Yes, the thermal suite has a steam room.',
        2,
        1,
      ),
      ai('pool-temp', 'How warm is the pool?', refusal, 3, 3),
      ai('lockers', 'Are there lockers for my things?', refusal, 2, 12),
      ai(
        'guest-weekend',
        'Can I bring guests at the weekend?',
        'Members may bring up to two guests per visit after 10:00.',
        1,
        5,
      ),
    ],
    dayPlans: [
      plan('a', 'Wednesday', ['I work from home'], [], 1),
      plan('b', 'Saturday', ['Training for an event'], [], 2),
      plan('c', 'Thursday', ['I need to unwind', 'I work from home'], [], 4),
      plan('d', 'Tuesday', ['I need to unwind'], [health], 6),
    ],
  }
}

// Shared across route bundles in one server process (Next.js may load this
// module more than once). Resets on restart, which is what demo mode wants.
const globalStore = globalThis as typeof globalThis & { __clubLaunchDemoStore?: DemoStore }

function store(): DemoStore {
  if (!globalStore.__clubLaunchDemoStore) {
    const history = demoHistory()
    globalStore.__clubLaunchDemoStore = {
      faqs: [...structuredClone(demoFaqs), ...history.faqs],
      drafts: [],
      dayPlans: history.dayPlans,
    }
  }
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
    const id = input.id
    store().faqs.push({
      _id: id,
      clubId: input.clubId,
      question: input.question,
      answer: input.answer,
      status: 'pending',
      source: 'ai',
      askedCount: 1,
      createdAt: new Date().toISOString(),
    })
    return { id }
  },

  async listClubsWithoutPage() {
    // Demo drafts live in memory and can't be opened (there is no Studio in demo
    // mode), so unlike Sanity they don't hide the club: the demo stays repeatable.
    const withPage = new Set(demoPages.map((p) => p.clubId))
    return demoClubs
      .filter((c) => !withPage.has(c._id))
      .map(({ _id, name, slug }) => ({ _id, name, slug }))
  },

  async createDraftClubPage(input) {
    const id = `drafts.clubPage-demo-${crypto.randomUUID()}`
    store().drafts.push({ ...input, _id: id })
    return { id }
  },

  async createDayPlan(plan) {
    const saved = dayPlanSchema.parse({ ...plan, createdAt: new Date().toISOString() })
    store().dayPlans.push(saved)
    return { id: saved.publicId }
  },

  async getDayPlan(publicId) {
    return store().dayPlans.find((p) => p.publicId === publicId) ?? null
  },

  async listQuestions(clubId): Promise<QuestionRecord[]> {
    return store()
      .faqs.filter((f) => f.clubId === clubId)
      .sort((a, b) => b.askedCount - a.askedCount)
      .map(({ _id, question, answer, status, source, askedCount, createdAt }) => ({
        _id,
        question,
        answer,
        status,
        source,
        askedCount,
        createdAt: createdAt ?? SEEDED_AT,
      }))
  },

  async listDayPlans(clubId) {
    return store().dayPlans.filter((p) => p.clubId === clubId)
  },
}
