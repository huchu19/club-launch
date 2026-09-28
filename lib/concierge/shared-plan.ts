import 'server-only'
import { getContentRepository } from '@/lib/content'
import { ratePlansOf } from '@/lib/content/rate-plans'
import type { ClubPageData } from '@/lib/content/types'
import type { DayPlanView } from './protocol'
import { toDayPlanView } from './view'

export const PUBLIC_ID = /^[a-z0-9]{8,32}$/

/**
 * A shared day plan with its club page, for the read-only share page and its
 * social image. Null for a malformed id, an unknown plan, or a plan that
 * belongs to a different club than the URL says.
 */
export async function loadSharedPlan(
  market: string,
  slug: string,
  id: string,
): Promise<{ page: ClubPageData; day: DayPlanView } | null> {
  if (!PUBLIC_ID.test(id)) return null
  const repository = getContentRepository()
  const [page, plan] = await Promise.all([
    repository.getClubPage(market, slug),
    repository.getDayPlan(id).catch(() => null),
  ])
  if (!page || !plan || plan.clubId !== page.club._id) return null
  return { page, day: toDayPlanView(plan, page.club, ratePlansOf(page.blocks)) }
}
