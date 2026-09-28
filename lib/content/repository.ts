import type {
  Club,
  ClubOption,
  ClubPageData,
  ClubPageSummary,
  DayPlan,
  FaqStatus,
  PageBlock,
  Seo,
} from './types'

/** An existing FAQ item that can answer a repeated question. */
export type FaqMatch = {
  _id: string
  question: string
  answer: string
  status: Exclude<FaqStatus, 'rejected'>
}

export type NewPendingFaq = {
  /** Chosen up front so the id can be sent to the visitor before the answer is saved. */
  id: string
  clubId: string
  question: string
  answer: string
  normalizedQuestion: string
}

/** Blocks as stored in Sanity: images reference uploaded assets. */
export type DraftClubPage = {
  clubId: string
  title: string
  seo?: Seo
  blocks: Array<Record<string, unknown> & { _type: PageBlock['_type']; _key: string }>
}

/**
 * Everything the app reads and writes. Two implementations: Sanity, and an
 * in-memory demo store built from the same data `pnpm seed` writes.
 */
export interface ContentRepository {
  readonly kind: 'sanity' | 'demo'

  /** Published club pages, for the index, sitemap and static params. */
  listClubPages(): Promise<ClubPageSummary[]>
  /** A club page by market and club slug. `preview` reads drafts (draft mode). */
  getClubPage(
    market: string,
    slug: string,
    options?: { preview?: boolean },
  ): Promise<ClubPageData | null>
  getClubBySlug(slug: string): Promise<Club | null>
  getClubById(id: string): Promise<Club | null>
  /** Approved answers for grounding the FAQ model. */
  getApprovedFaqs(clubId: string): Promise<Array<{ question: string; answer: string }>>

  /** An approved or pending FAQ item whose question normalises to the same text. */
  findFaqMatch(clubId: string, normalizedQuestion: string): Promise<FaqMatch | null>
  incrementFaqAskedCount(id: string): Promise<void>
  createPendingFaq(input: NewPendingFaq): Promise<{ id: string }>

  /** Clubs with no club page at all (published or draft), for the AI drafter. */
  listClubsWithoutPage(): Promise<ClubOption[]>
  /** Creates an unpublished draft. Never publishes. */
  createDraftClubPage(input: DraftClubPage): Promise<{ id: string }>

  /** Stores a first-day plan under its public id. */
  createDayPlan(plan: DayPlan): Promise<{ id: string }>
  getDayPlan(publicId: string): Promise<DayPlan | null>
}
