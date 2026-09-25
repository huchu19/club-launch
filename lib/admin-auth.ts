import { checkBasicAuth } from './basic-auth'

/**
 * Defence in depth for admin API routes: proxy.ts already requires basic
 * auth, but each handler checks again in case the matcher ever changes.
 * Returns a response to send, or null when the caller is allowed.
 */
export function requireAdmin(request: Request): Response | null {
  const result = checkBasicAuth(
    request.headers.get('authorization'),
    process.env.ADMIN_USER,
    process.env.ADMIN_PASSWORD,
  )
  if (result === 'ok') return null
  if (result === 'not-configured') {
    return Response.json({ error: 'Admin access is not configured.' }, { status: 503 })
  }
  return Response.json(
    { error: 'Authentication required.' },
    {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Club Launch admin", charset="UTF-8"' },
    },
  )
}
