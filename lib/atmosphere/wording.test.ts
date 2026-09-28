import { describe, expect, it } from 'vitest'
import { heroWording, periodHighlights } from './period'

const base = { eyebrow: 'Mayfair', subheading: 'Default words.' }

describe('heroWording', () => {
  it('uses the editor’s variant for the period', () => {
    const wording = heroWording(
      base,
      [{ period: 'evening', eyebrow: 'This evening', highlightLabel: 'Unwind tonight' }],
      'evening',
    )
    expect(wording).toEqual({
      eyebrow: 'This evening',
      subheading: 'Default words.',
      highlightLabel: 'Unwind tonight',
    })
  })

  it('falls back to the defaults for anything not set', () => {
    expect(heroWording(base, [], 'morning')).toEqual({
      ...base,
      highlightLabel: periodHighlights.morning.label,
    })
    expect(heroWording(base, [{ period: 'night', eyebrow: '' }], 'night').eyebrow).toBe('Mayfair')
  })
})
