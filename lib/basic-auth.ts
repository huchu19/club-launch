import { createHash, timingSafeEqual } from 'node:crypto'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/** Constant-time string comparison (hashing first hides length differences). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b))
}

export type BasicAuthResult = 'ok' | 'unauthorized' | 'not-configured'

/** Checks an `Authorization: Basic ...` header against the expected credentials. */
export function checkBasicAuth(
  header: string | null,
  expectedUser: string | undefined,
  expectedPassword: string | undefined,
): BasicAuthResult {
  if (!expectedUser || !expectedPassword) return 'not-configured'
  if (!header?.startsWith('Basic ')) return 'unauthorized'

  let decoded: string
  try {
    decoded = Buffer.from(header.slice('Basic '.length).trim(), 'base64').toString('utf8')
  } catch {
    return 'unauthorized'
  }

  const separator = decoded.indexOf(':')
  if (separator === -1) return 'unauthorized'
  const user = decoded.slice(0, separator)
  const password = decoded.slice(separator + 1)

  // Evaluate both comparisons so timing doesn't reveal which one failed.
  const userOk = safeEqual(user, expectedUser)
  const passwordOk = safeEqual(password, expectedPassword)
  return userOk && passwordOk ? 'ok' : 'unauthorized'
}
