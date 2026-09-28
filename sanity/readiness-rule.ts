import type { SanityDocument, ValidationContext } from 'sanity'
import {
  readinessChecks,
  readinessScore,
  type ReadinessCheck,
  type ReadinessInput,
} from '../lib/readiness/checks'

// Studio side of the launch readiness check: the same rules as the site's
// tests, fed with the club document and its approved FAQ count.

export const READINESS_API_VERSION = '2025-01-01'

type Fetcher = { fetch: <T>(query: string, params: Record<string, unknown>) => Promise<T> }
type ClubPageDoc = ReadinessInput['page'] & { club?: { _ref?: string } }

const CLUB_FACTS = `{
  "club": *[_id == $clubId][0]{ openingHours, seo },
  "approvedFaqs": count(*[_type == "faqItem" && club._ref == $clubId && status == "approved"
    && !(_id in path("drafts.**"))])
}`

export type Readiness = { checks: ReadinessCheck[]; score: number }

export async function loadReadiness(client: Fetcher, doc: ClubPageDoc): Promise<Readiness> {
  const clubId = doc.club?._ref
  const facts = clubId
    ? await client.fetch<{ club: ReadinessInput['club']; approvedFaqs: number }>(CLUB_FACTS, {
        clubId,
      })
    : { club: null, approvedFaqs: 0 }
  const checks = readinessChecks({
    page: doc,
    club: facts.club,
    approvedFaqCount: facts.approvedFaqs,
  })
  return { checks, score: readinessScore(checks) }
}

/**
 * Document rule: publishing is blocked until every readiness check passes.
 * Placeholders are left to the placeholder rule, so they aren't reported twice.
 */
export async function readinessRule(
  doc: SanityDocument | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!doc) return true
  const client = context.getClient({ apiVersion: READINESS_API_VERSION })
  const { checks, score } = await loadReadiness(client, doc as unknown as ClubPageDoc)
  const failing = checks.filter((c) => !c.ok && c.id !== 'placeholders')
  if (failing.length === 0) return true
  return `Not ready to launch (${score}%). ${failing.flatMap((c) => c.problems).join('. ')}.`
}
