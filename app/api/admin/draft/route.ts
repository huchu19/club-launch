import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getDrafterModel } from '@/lib/ai/model'
import { getContentRepository } from '@/lib/content'
import { draftRequestSchema } from '@/lib/drafter/schema'
import {
  ClubHasPageError,
  ClubNotFoundError,
  draftClubPage,
  DraftGenerationError,
} from '@/lib/drafter/service'
import { createRateLimiter } from '@/lib/rate-limit'
import { clientIp, PayloadTooLargeError, readJson } from '@/lib/request'

export const maxDuration = 60

// Protects the free Gemini quota: 10 drafts / 10 minutes per IP, per instance.
const drafterRateLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 })

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied

  const limit = drafterRateLimiter.check(`drafter:${clientIp(request)}`)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many drafts in a short time. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await readJson(request, 8_000)
  } catch (error) {
    const tooLarge = error instanceof PayloadTooLargeError
    return NextResponse.json(
      { error: tooLarge ? 'Request is too large.' : 'Request body must be JSON.' },
      { status: tooLarge ? 413 : 400 },
    )
  }

  const parsed = draftRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' },
      { status: 400 },
    )
  }

  try {
    const result = await draftClubPage(parsed.data, {
      repository: getContentRepository(),
      model: getDrafterModel,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ClubNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ClubHasPageError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof DraftGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('[drafter] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'The draft could not be created. Check the AI and Sanity settings and try again.' },
      { status: 500 },
    )
  }
}
