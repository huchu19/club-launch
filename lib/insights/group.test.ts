import { describe, expect, it } from 'vitest'
import { groupQuestions, questionTokens, similarity, stem } from './group'

const q = (question: string, askedCount = 1) => ({ question, askedCount })

describe('question grouping', () => {
  it('stems plurals and -ing forms, and drops filler words', () => {
    expect(stem('parking')).toBe('park')
    expect(stem('classes')).toBe('class')
    expect(stem('towels')).toBe('towel')
    expect(stem('glass')).toBe('glass')
    expect([...questionTokens('Is there parking at the club?')]).toEqual(['park'])
  })

  it('scores word overlap from 0 to 1', () => {
    expect(
      similarity(questionTokens('Where can I park?'), questionTokens('Is there parking?')),
    ).toBe(1)
    expect(
      similarity(questionTokens('Can I bring a guest?'), questionTokens('Is there parking?')),
    ).toBe(0)
  })

  it('groups near-duplicates under the most-asked question', () => {
    const groups = groupQuestions([
      q('Is there parking at the club?', 14),
      q('Where can I park?', 3),
      q('Is there any car parking nearby?', 2),
      q('Can I bring a guest?', 11),
      q('Can I bring guests at the weekend?', 1),
      q('Do you have a steam room?', 4),
    ])
    expect(groups.map((g) => [g.lead.question, g.members.length, g.totalAsked])).toEqual([
      ['Is there parking at the club?', 3, 19],
      ['Can I bring a guest?', 2, 12],
      ['Do you have a steam room?', 1, 4],
    ])
  })

  it('keeps unrelated questions apart even when they share a word', () => {
    const groups = groupQuestions([q('Are classes included?', 5), q('Is the spa included?', 4)])
    expect(groups).toHaveLength(2)
  })

  it('handles an empty list', () => {
    expect(groupQuestions([])).toEqual([])
  })
})
