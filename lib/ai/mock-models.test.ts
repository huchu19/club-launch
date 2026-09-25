import { describe, expect, it } from 'vitest'
import { demoClubs, demoFaqs } from '@/lib/content/demo-data'
import { buildGroundingContext } from '@/lib/faq/context'
import { buildFaqPrompt } from '@/lib/faq/prompt'
import { mockFaqOutcome } from './mock-models'

const mayfair = demoClubs[0]!
const context = buildGroundingContext(
  mayfair,
  demoFaqs.filter((f) => f.status === 'approved'),
)
const ask = (q: string) => mockFaqOutcome(buildFaqPrompt(context, q))

describe('mock FAQ model fixtures', () => {
  it('answers in-context questions from the matching fact', () => {
    const outcome = ask('Do you have a steam room?')
    expect(outcome.kind).toBe('answer')
    expect(outcome.kind !== 'quota' && outcome.text).toMatch(/steam room/)
  })

  it('refuses medical questions, unknown topics and unlisted prices', () => {
    for (const q of [
      'Is the sauna safe for my heart condition?',
      'Do you sell concert tickets?',
      'How much does a personal trainer cost?',
    ]) {
      const outcome = ask(q)
      expect(outcome.kind, q).toBe('refusal')
      expect(outcome.kind !== 'quota' && outcome.text).toMatch(/can’t answer that/)
    }
  })

  it('answers listed prices', () => {
    const outcome = ask('How much is the joining fee?')
    expect(outcome.kind !== 'quota' && outcome.text).toContain('£150')
  })

  it('simulates an exhausted quota on request', () => {
    expect(ask('quota test: is there parking?')).toEqual({ kind: 'quota' })
  })
})
