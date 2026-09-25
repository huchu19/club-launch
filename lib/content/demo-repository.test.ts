import { beforeEach, describe, expect, it } from 'vitest'
import { MAYFAIR_ID } from './demo-data'
import { demoRepository, resetDemoStore } from './demo-repository'

beforeEach(() => resetDemoStore())

describe('demo repository', () => {
  it('only shows approved FAQ items on the page', async () => {
    await demoRepository.createPendingFaq({
      id: 'faq-pending',
      clubId: MAYFAIR_ID,
      question: 'Is the sauna mixed?',
      answer: 'Yes.',
      normalizedQuestion: 'is the sauna mixed',
    })
    const page = await demoRepository.getClubPage('uk', 'linden-mayfair')
    expect(page?.faqs.map((f) => f._id)).not.toContain('faq-pending')
    expect(page?.faqs).toHaveLength(5)
  })

  it('lists clubs without a page, and a draft counts as a page', async () => {
    expect((await demoRepository.listClubsWithoutPage()).map((c) => c.slug)).toEqual([
      'linden-moorgate',
    ])
    await demoRepository.createDraftClubPage({
      clubId: 'club-linden-moorgate',
      title: 'Draft',
      blocks: [],
    })
    expect(await demoRepository.listClubsWithoutPage()).toEqual([])
  })

  it('returns null for unknown markets and clubs', async () => {
    expect(await demoRepository.getClubPage('fr', 'linden-mayfair')).toBeNull()
    expect(await demoRepository.getClubPage('uk', 'linden-moorgate')).toBeNull()
  })
})
