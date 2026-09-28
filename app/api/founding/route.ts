import { NextResponse, type NextRequest } from 'next/server'
import { getContentRepository } from '@/lib/content'
import type { Club, FoundingBlockData } from '@/lib/content/types'
import { getCrmAdapter, withOneRetry } from '@/lib/crm'
import { errorMessage } from '@/lib/crm/adapter'
import { foundingReference } from '@/lib/crm/mock'
import { claimPlace, placesLeft, releasePlace } from '@/lib/founding/places'
import { foundingFieldErrors, foundingSignupSchema } from '@/lib/founding/schema'
import { createRateLimiter } from '@/lib/rate-limit'
import { clientIp, PayloadTooLargeError, readJson } from '@/lib/request'

// Founding member signups: the same validation, honeypot and rate limit as tour
// bookings. A place is claimed atomically before the CRM is called, and given
// back if the CRM can't take the signup.

const foundingRateLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 })

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

/** The club's founding offer, if it is coming soon and its page has one. */
async function foundingOffer(
  slug: string,
): Promise<{ club: Club; offer: FoundingBlockData } | null> {
  const repository = getContentRepository()
  const club = await repository.getClubBySlug(slug)
  if (!club || club.status !== 'coming-soon') return null
  const page = await repository.getClubPage(club.market.code, club.slug)
  const offer = page?.blocks.find((b) => b._type === 'foundingBlock')
  return offer ? { club, offer } : null
}

/** Live places left, for the block to refresh after the static page loads. */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('club') ?? ''
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return json({ error: 'Unknown club.' }, 404)
  const found = await foundingOffer(slug)
  if (!found) return json({ error: 'There is no founding offer for this club.' }, 404)
  const { taken } = await getContentRepository().foundingPlaces.read(found.club._id)
  return json({
    total: found.offer.totalPlaces,
    placesLeft: placesLeft(found.offer.totalPlaces, taken),
  })
}

export async function POST(request: NextRequest) {
  const limit = foundingRateLimiter.check(`founding:${clientIp(request)}`)
  if (!limit.ok) {
    return json({ error: 'Too many requests. Please wait a few minutes and try again.' }, 429, {
      'Retry-After': String(limit.retryAfterSeconds),
    })
  }

  let body: unknown
  try {
    body = await readJson(request)
  } catch (error) {
    return error instanceof PayloadTooLargeError
      ? json({ error: 'Request is too large.' }, 413)
      : json({ error: 'Request body must be JSON.' }, 400)
  }

  const parsed = foundingSignupSchema.safeParse(body)
  if (!parsed.success) {
    return json(
      { error: 'Check the highlighted fields.', fieldErrors: foundingFieldErrors(parsed.error) },
      400,
    )
  }
  const signup = parsed.data

  const found = await foundingOffer(signup.clubSlug)
  if (!found) return json({ error: 'There is no founding offer for this club.' }, 404)
  const { club, offer } = found
  const places = getContentRepository().foundingPlaces

  // Honeypot filled: pretend it worked so bots learn nothing, but take no place.
  if (signup.website?.trim()) {
    console.info('[founding] honeypot triggered; request dropped')
    const { taken } = await places.read(club._id)
    return json({
      reference: foundingReference(),
      placesLeft: placesLeft(offer.totalPlaces, taken),
    })
  }

  const claim = await claimPlace(places, club._id, offer.totalPlaces)
  if (!claim.ok) {
    return claim.reason === 'sold-out'
      ? json({ error: 'All the founding places have gone.', soldOut: true, placesLeft: 0 }, 409)
      : json({ error: 'Lots of people are signing up right now. Please try again.' }, 503)
  }

  const adapter = getCrmAdapter()
  try {
    const { id } = await withOneRetry(adapter.name, () =>
      adapter.submitFoundingMember({
        clubSlug: club.slug,
        name: signup.name,
        email: signup.email,
        phone: signup.phone || undefined,
        consentedAt: new Date().toISOString(),
      }),
    )
    return json({ reference: id, placesLeft: claim.placesLeft })
  } catch (error) {
    console.error('[founding] CRM submission failed after retry:', errorMessage(error))
    await releasePlace(places, club._id).catch(() => {})
    return json(
      {
        error:
          'We could not save your place just now. Your details are still here, so please try again in a moment.',
      },
      502,
    )
  }
}
