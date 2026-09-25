import { draftMode } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

async function disable(request: NextRequest) {
  ;(await draftMode()).disable()
  return NextResponse.redirect(new URL('/', request.url), 303)
}

export const GET = disable
export const POST = disable
