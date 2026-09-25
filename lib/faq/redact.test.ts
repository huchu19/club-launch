import { describe, expect, it } from 'vitest'
import { redactPersonalData } from './redact'

describe('redactPersonalData', () => {
  it('removes email addresses and phone numbers', () => {
    expect(redactPersonalData('Email me at sam.rivera@example.co.uk about parking')).toBe(
      'Email me at [email removed] about parking',
    )
    expect(redactPersonalData('Call +44 (0)20 7946 0018 please')).toBe(
      'Call [phone number removed] please',
    )
    expect(redactPersonalData('My number is 07700 900123')).toBe(
      'My number is [phone number removed]',
    )
  })

  it('leaves times, prices and short numbers alone', () => {
    const text = 'Is the pool open at 06:00 for £30 on the 20-metre lanes?'
    expect(redactPersonalData(text)).toBe(text)
  })
})
