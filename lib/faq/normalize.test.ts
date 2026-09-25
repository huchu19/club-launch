import { describe, expect, it } from 'vitest'
import { normalizeQuestion } from './normalize'

describe('normalizeQuestion', () => {
  it('lower-cases, trims, strips punctuation and collapses spaces', () => {
    expect(normalizeQuestion('  Is there PARKING??  ')).toBe('is there parking')
    expect(normalizeQuestion('Is   there\tparking,\nplease!')).toBe('is there parking please')
  })

  it('treats curly and straight apostrophes the same', () => {
    expect(normalizeQuestion('What’s the guest policy?')).toBe(
      normalizeQuestion("What's the guest policy"),
    )
    expect(normalizeQuestion("What's")).toBe('whats')
  })

  it('keeps words separated by other punctuation apart', () => {
    expect(normalizeQuestion('gym/pool - open?')).toBe('gym pool open')
  })

  it('keeps letters from other scripts and digits', () => {
    expect(normalizeQuestion('Café opens at 7am?')).toBe('café opens at 7am')
  })
})
