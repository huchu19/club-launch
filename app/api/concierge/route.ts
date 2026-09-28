import { NextResponse, type NextRequest } from 'next/server'
import { getConciergeModel } from '@/lib/ai/model'
import { getContentRepository } from '@/lib/content'
import { conciergeRequestSchema, type ConciergeResponse } from '@/lib/concierge/protocol'
import { planFirstDay } from '@/lib/concierge/service'
import { ratePlansOf } from '@/lib/concierge/view'
import { createRateLimiter } from '@/lib/rate-limit'
import { clientIp, PayloadTooLargeError, readJson } from '@/lib/request'

// Two model calls at most (one retry), so allow for a slow free tier.
export const maxDuration = 60

// Protects the free Gemini quota: 5 plans / 10 minutes per IP, per instance.
const conciergeRateLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 })

const json = (body: ConciergeResponse | { error: string }, status = 200, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers })

export async function POST(request: NextRequest) {
  const limit = conciergeRateLimiter.check(`concierge:${clientIp(request)}`)
  if (!limit.ok) {
    return json({ error: 'You’ve planned a few days already. Please wait a few minutes.' }, 429, {
      'Retry-After': String(limit.retryAfterSeconds),
    })
  }

  let body: unknown
  try {
    body = await readJson(request, 4_000)
  } catch (error) {
    return error instanceof PayloadTooLargeError
      ? json({ error: 'Request is too large.' }, 413)
      : json({ error: 'Request body must be JSON.' }, 400)
  }

  const parsed = conciergeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? 'Check your message and try again.' },
      400,
    )
  }

  const repository = getContentRepository()
  const club = await repository.getClubBySlug(parsed.data.clubSlug)
  const page = club && (await repository.getClubPage(club.market.code, club.slug))
  const block = page?.blocks.find((b) => b._type === 'conciergeBlock')
  if (!club || !page || !block || club.spaces.length === 0) {
    return json({ error: 'Day planning isn’t available for this club.' }, 404)
  }

  const result = await planFirstDay(
    {
      club,
      plans: ratePlansOf(page.blocks),
      message: parsed.data.message,
      // Only the block's own options reach the model or the stored plan.
      chips: parsed.data.chips.filter((chip) => block.chips.includes(chip)),
    },
    { repository, model: getConciergeModel },
  )

  switch (result.kind) {
    case 'planned':
      return json({ status: 'planned', plan: result.plan })
    case 'refusal':
      return json({ status: 'refusal', message: result.message })
    case 'failed':
      return json({ status: 'failed', message: result.message }, 502)
    case 'unavailable':
      return json({ status: 'unavailable', message: result.message }, 503)
  }
}
