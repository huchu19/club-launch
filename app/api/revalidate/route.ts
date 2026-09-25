import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { z } from 'zod'
import { tagsForDocument } from '@/lib/content/tags'
import { serverEnv } from '@/lib/env'

// Sanity GROQ webhook → expire cache tags (docs/SPEC.md §7). Configure the
// webhook projection as: {_type, "slug": slug.current, "clubSlug": club->slug.current}

const payloadSchema = z.object({
  _type: z.string().min(1).max(64),
  slug: z.string().max(200).nullish(),
  clubSlug: z.string().max(200).nullish(),
})

export async function POST(request: NextRequest) {
  const secret = serverEnv().SANITY_REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Revalidation is not configured.' }, { status: 503 })
  }

  let parsedBody: Awaited<ReturnType<typeof parseBody>>
  try {
    // `true` waits for Content Lake consistency so the refetch sees the change.
    parsedBody = await parseBody(request, secret, true)
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!parsedBody.isValidSignature) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const payload = payloadSchema.safeParse(parsedBody.body)
  if (!payload.success) {
    return NextResponse.json({ error: 'Unexpected payload.' }, { status: 400 })
  }

  const tags = tagsForDocument(payload.data)
  // Webhook-driven, so expire immediately rather than serve stale (Next 16).
  for (const tag of tags) revalidateTag(tag, { expire: 0 })

  return NextResponse.json({ revalidated: tags, now: Date.now() })
}
