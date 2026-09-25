import { APICallError, simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockFaqModel, userText } from '@/lib/ai/mock-models'
import { demoRepository, resetDemoStore } from '@/lib/content/demo-repository'
import { MAYFAIR_ID } from '@/lib/content/demo-data'
import { normalizeQuestion } from './normalize'
import { FALLBACK_ANSWER } from './protocol'
import { answerVisitorQuestion, type FaqDeps, type FaqResult } from './service'

async function readAll(result: FaqResult) {
  if (result.kind !== 'streaming') throw new Error(`expected streaming, got ${result.kind}`)
  const text = await new Response(result.stream).text()
  return { text, saved: await result.saved }
}

let model: MockLanguageModelV4
let deps: FaqDeps

beforeEach(() => {
  resetDemoStore()
  model = createMockFaqModel(0)
  deps = { repository: demoRepository, model: () => model, newId: () => 'faq-new' }
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

const ask = (question: string, clubSlug = 'linden-mayfair') =>
  answerVisitorQuestion({ clubSlug, question }, deps)

describe('answerVisitorQuestion', () => {
  it('streams a grounded answer and saves it as a pending AI item', async () => {
    const { text, saved } = await readAll(await ask('Is there a steam room?'))
    expect(text).toMatch(/steam room/)
    expect(saved).toBe(true)
    const match = await demoRepository.findFaqMatch(
      MAYFAIR_ID,
      normalizeQuestion('Is there a steam room'),
    )
    expect(match).toMatchObject({ _id: 'faq-new', status: 'pending', answer: text })
  })

  it('answers a repeated question from the saved item without calling the model', async () => {
    await readAll(await ask('Is there a steam room?'))
    expect(model.doStreamCalls).toHaveLength(1)
    const repeat = await ask('  is there a STEAM room ')
    expect(repeat).toMatchObject({ kind: 'cached', id: 'faq-new', status: 'pending' })
    expect(model.doStreamCalls).toHaveLength(1)
  })

  it('answers an approved question from the CMS and counts the ask', async () => {
    const result = await ask('Can I bring a guest?')
    expect(result).toMatchObject({ kind: 'cached', id: 'faq-mayfair-guests', status: 'approved' })
    expect(model.doStreamCalls).toHaveLength(0)
    const store = (
      globalThis as { __clubLaunchDemoStore?: { faqs: Array<{ _id: string; askedCount: number }> } }
    ).__clubLaunchDemoStore
    expect(store?.faqs.find((f) => f._id === 'faq-mayfair-guests')?.askedCount).toBe(12)
  })

  it('refuses medical questions politely (and keeps them for editor review)', async () => {
    const { text, saved } = await readAll(
      await ask('Can you advise on exercises for my knee injury?'),
    )
    expect(text).toMatch(/can’t answer that from the information I have about Linden Mayfair/)
    expect(text).toMatch(/book a tour/)
    expect(saved).toBe(true)
  })

  it('grounds the model only on this club and fences the question', async () => {
    await readAll(await ask('Is there a pool?'))
    const prompt = userText(model.doStreamCalls[0]!.prompt)
    expect(prompt).toContain('Club: Linden Mayfair')
    expect(prompt).not.toContain('Linden Moorgate')
    expect(prompt).toMatch(/<visitor_question>\nIs there a pool\?\n<\/visitor_question>$/)
  })

  it('removes contact details before the model sees the question', async () => {
    await readAll(await ask('Is there parking? Reply to sam@example.com or 07700 900123'))
    const prompt = userText(model.doStreamCalls[0]!.prompt)
    expect(prompt).not.toContain('sam@example.com')
    expect(prompt).not.toContain('900123')
  })

  it('returns the fallback and saves nothing when the quota is exhausted', async () => {
    const result = await ask('quota check: is there parking?')
    expect(result).toEqual({ kind: 'fallback', answer: FALLBACK_ANSWER, reason: 'model-error' })
    expect(
      await demoRepository.findFaqMatch(
        MAYFAIR_ID,
        normalizeQuestion('quota check: is there parking?'),
      ),
    ).toBeNull()
  })

  it('returns the fallback when no model is configured', async () => {
    deps.model = () => {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set')
    }
    expect(await ask('Is there a pool?')).toMatchObject({ kind: 'fallback', reason: 'unavailable' })
  })

  it('appends the fallback and saves nothing if the model fails mid-answer', async () => {
    model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: 't' },
            { type: 'text-delta', id: 't', delta: 'The pool is ' },
            {
              type: 'error',
              error: new APICallError({ message: 'boom', url: 'x', requestBodyValues: {} }),
            },
          ],
        }),
      }),
    })
    const { text, saved } = await readAll(await ask('Is the pool heated?'))
    expect(text).toBe(`The pool is \n\n${FALLBACK_ANSWER}`)
    expect(saved).toBe(false)
  })

  it('reports an unknown club', async () => {
    expect(await ask('Is there a pool?', 'nowhere')).toEqual({ kind: 'not-found' })
  })
})
