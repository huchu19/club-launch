/** Best-effort client IP (Vercel sets x-forwarded-for; the first entry is the client). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export class PayloadTooLargeError extends Error {}

/** Reads a JSON body, rejecting anything over `maxBytes` before parsing. */
export async function readJson(request: Request, maxBytes = 10_000): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > maxBytes) throw new PayloadTooLargeError()
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) throw new PayloadTooLargeError()
  return JSON.parse(text) as unknown
}
