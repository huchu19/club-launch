import { NextResponse, type NextRequest } from 'next/server'
import { toLeadDayPlan } from '@/lib/concierge/view'
import { getContentRepository } from '@/lib/content'
import type { Club } from '@/lib/content/types'
import { getCrmAdapter, submitLeadWithRetry } from '@/lib/crm'
import { errorMessage } from '@/lib/crm/adapter'
import { tourReference } from '@/lib/crm/mock'
import { createRateLimiter } from '@/lib/rate-limit'
import { clientIp, PayloadTooLargeError, readJson } from '@/lib/request'
import { createTourRequestSchema, tourFieldErrors } from '@/lib/tour/schema'

// 5 requests / 10 minutes per IP, per instance (see lib/rate-limit.ts).
const tourRateLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 })

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers })

/**
 * The visitor's first-day plan, if they booked from one. A missing, unreadable
 * or other club's plan is ignored rather than failing the booking.
 */
async function sharedDayPlan(id: string | undefined, club: Club) {
  if (!id) return undefined
  const plan = await getContentRepository()
    .getDayPlan(id)
    .catch((error: unknown) => {
      console.warn('[tour] could not load the day plan:', errorMessage(error))
      return null
    })
  return plan && plan.clubId === club._id ? toLeadDayPlan(plan, club) : undefined
}

export async function POST(request: NextRequest) {
  const limit = tourRateLimiter.check(`tour:${clientIp(request)}`)
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

  const parsed = createTourRequestSchema().safeParse(body)
  if (!parsed.success) {
    return json(
      { error: 'Check the highlighted fields.', fieldErrors: tourFieldErrors(parsed.error) },
      400,
    )
  }
  const request_ = parsed.data

  // Honeypot filled: pretend it worked so bots learn nothing, but send nothing.
  if (request_.website?.trim()) {
    console.info('[tour] honeypot triggered; request dropped')
    return json({ reference: tourReference() })
  }

  const club = await getContentRepository().getClubBySlug(request_.clubSlug)
  if (!club) return json({ error: 'That club could not be found.' }, 404)

  try {
    const { id } = await submitLeadWithRetry(getCrmAdapter(), {
      lead: {
        clubSlug: club.slug,
        name: request_.name,
        email: request_.email,
        phone: request_.phone || undefined,
        preferredDate: request_.preferredDate,
        timeSlot: request_.timeSlot,
        consentedAt: new Date().toISOString(),
      },
      dayPlan: await sharedDayPlan(request_.dayPlanId, club),
    })
    return json({ reference: id })
  } catch (error) {
    console.error('[tour] CRM submission failed after retry:', errorMessage(error))
    return json(
      {
        error:
          'We could not send your request just now. Your details are still here, so please try again in a moment or call the club.',
      },
      502,
    )
  }
}
