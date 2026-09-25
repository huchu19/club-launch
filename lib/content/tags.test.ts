import { describe, expect, it } from 'vitest'
import { clubPageTags, tagsForDocument } from './tags'

describe('cache tags', () => {
  it('tags club page reads with every type they depend on plus the club slug', () => {
    expect(clubPageTags('linden-mayfair')).toEqual([
      'clubPage',
      'club',
      'faqItem',
      'market',
      'club:linden-mayfair',
    ])
  })

  it('expires the document type and the related club slug', () => {
    expect(tagsForDocument({ _type: 'club', slug: 'linden-mayfair' })).toEqual([
      'club',
      'club:linden-mayfair',
    ])
    expect(tagsForDocument({ _type: 'faqItem', clubSlug: 'linden-mayfair' })).toEqual([
      'faqItem',
      'club:linden-mayfair',
    ])
    expect(tagsForDocument({ _type: 'market', slug: null })).toEqual(['market'])
  })
})
