import { NextResponse, type NextRequest } from 'next/server'
import { getFaqModel } from '@/lib/ai/model'
import { getContentRepository } from '@/lib/content'
import {
  FAQ_HEADERS,
  faqRequestSchema,
  type FaqAnswerSource,
  type FaqAnswerStatus,
} from '@/lib/faq/protocol'
import { answerVisitorQuestion } from '@/lib/faq/service'
import { createRateLimiter } from '@/lib/rate-limit'
import { clientIp, PayloadTooLargeError, readJson } from '@/lib/request'

export const maxDuration = 30

// 10 questions / 10 minutes per IP, per instance (see lib/rate-limit.ts).
const faqRateLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 })

function textResponse(
  body: BodyInit,
  meta: { status: FaqAnswerStatus; source: FaqAnswerSource; id?: string },
) {
  const headers = new Headers({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    [FAQ_HEADERS.status]: meta.status,
    [FAQ_HEADERS.source]: meta.source,
  })
  if (meta.id) headers.set(FAQ_HEADERS.id, meta.id)
  return new Response(body, { headers })
}

export async function POST(request: NextRequest) {
  const limit = faqRateLimiter.check(`faq:${clientIp(request)}`)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'You have asked a lot of questions. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await readJson(request, 4_000)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof PayloadTooLargeError
            ? 'Request is too large.'
            : 'Request body must be JSON.',
      },
      { status: error instanceof PayloadTooLargeError ? 413 : 400 },
    )
  }

  const parsed = faqRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check your question and try again.' },
      { status: 400 },
    )
  }

  const result = await answerVisitorQuestion(parsed.data, {
    repository: getContentRepository(),
    model: getFaqModel,
  })

  switch (result.kind) {
    case 'not-found':
      return NextResponse.json({ error: 'That club could not be found.' }, { status: 404 })
    case 'cached':
      return textResponse(result.answer, { status: result.status, source: 'cache', id: result.id })
    case 'fallback':
      return textResponse(result.answer, { status: 'fallback', source: 'fallback' })
    case 'streaming':
      return textResponse(result.stream, { status: 'pending', source: 'model', id: result.id })
  }
}
