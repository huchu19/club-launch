import { describe, expect, it } from 'vitest'
import { findPlaceholders, hasPlaceholderMarker, placeholderSummary } from './placeholders'

describe('findPlaceholders', () => {
  it('finds tokens with kind, label and path in nested documents', () => {
    const doc = {
      _id: 'drafts.page',
      title: 'Moorgate',
      blocks: [
        { _type: 'heroBlock', _key: 'a', heading: 'Opening [[DATE: launch date]]' },
        {
          _type: 'ratesBlock',
          _key: 'b',
          plans: [{ _key: 'c', name: 'Club', pricePerMonth: '[[PRICE: monthly membership]]' }],
        },
      ],
    }
    expect(findPlaceholders(doc)).toEqual([
      {
        raw: '[[DATE: launch date]]',
        kind: 'DATE',
        label: 'launch date',
        path: 'blocks[0].heading',
      },
      {
        raw: '[[PRICE: monthly membership]]',
        kind: 'PRICE',
        label: 'monthly membership',
        path: 'blocks[1].plans[0].pricePerMonth',
      },
    ])
  })

  it('treats an unfinished marker as a placeholder so publishing stays blocked', () => {
    expect(findPlaceholders({ heading: 'Price [[ tbc' })).toEqual([
      { raw: '[[', kind: 'UNKNOWN', label: 'Unfinished placeholder', path: 'heading' },
    ])
  })

  it('normalises kinds and ignores system fields', () => {
    const found = findPlaceholders({ _id: '[[X: y]]', text: '[[ joining fee : one-off ]]' })
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ kind: 'JOINING_FEE', label: 'one-off' })
  })

  it('returns nothing for clean content', () => {
    expect(findPlaceholders({ a: 'Hello', b: [1, true, null], c: { d: 'World' } })).toEqual([])
    expect(hasPlaceholderMarker('No markers here [x]')).toBe(false)
  })
})

describe('placeholderSummary', () => {
  it('lists up to three unique tokens', () => {
    const found = findPlaceholders(['[[A: 1]]', '[[A: 1]]', '[[B: 2]]', '[[C: 3]]', '[[D: 4]]'])
    expect(placeholderSummary(found)).toBe('[[A: 1]], [[B: 2]], [[C: 3]] and 1 more')
  })
})
