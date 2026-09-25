import { describe, expect, it } from 'vitest'
import { checkBasicAuth, safeEqual } from './basic-auth'

const header = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`

describe('checkBasicAuth', () => {
  it('accepts matching credentials', () => {
    expect(checkBasicAuth(header('admin', 's3cret'), 'admin', 's3cret')).toBe('ok')
  })

  it('allows colons in the password', () => {
    expect(checkBasicAuth(header('admin', 'a:b:c'), 'admin', 'a:b:c')).toBe('ok')
  })

  it('rejects a wrong password or user', () => {
    expect(checkBasicAuth(header('admin', 'nope'), 'admin', 's3cret')).toBe('unauthorized')
    expect(checkBasicAuth(header('root', 's3cret'), 'admin', 's3cret')).toBe('unauthorized')
  })

  it('rejects missing or malformed headers', () => {
    expect(checkBasicAuth(null, 'admin', 's3cret')).toBe('unauthorized')
    expect(checkBasicAuth('Bearer abc', 'admin', 's3cret')).toBe('unauthorized')
    expect(checkBasicAuth('Basic bm9jb2xvbg==', 'admin', 's3cret')).toBe('unauthorized')
  })

  it('fails closed when credentials are not configured', () => {
    expect(checkBasicAuth(header('admin', ''), 'admin', undefined)).toBe('not-configured')
    expect(checkBasicAuth(header('', ''), undefined, undefined)).toBe('not-configured')
  })
})

describe('safeEqual', () => {
  it('compares strings of different lengths without throwing', () => {
    expect(safeEqual('a', 'abc')).toBe(false)
    expect(safeEqual('abc', 'abc')).toBe(true)
  })
})
