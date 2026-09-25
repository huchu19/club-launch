import { NextResponse, type NextRequest } from 'next/server'
import { checkBasicAuth } from '@/lib/basic-auth'

/** Basic auth for the admin drafter UI and its API (docs/SPEC.md §2). */
export function proxy(request: NextRequest) {
  const result = checkBasicAuth(
    request.headers.get('authorization'),
    process.env.ADMIN_USER,
    process.env.ADMIN_PASSWORD,
  )

  if (result === 'ok') return NextResponse.next()

  if (result === 'not-configured') {
    return new NextResponse('Admin access is not configured on this deployment.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'WWW-Authenticate': 'Basic realm="Club Launch admin", charset="UTF-8"',
    },
  })
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
