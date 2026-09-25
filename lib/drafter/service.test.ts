import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockDrafterModel, mockDraftFor, userText } from '@/lib/ai/mock-models'
import { demoRepository, resetDemoStore } from '@/lib/content/demo-repository'
import { MAYFAIR_ID, MOORGATE_ID, demoClubs } from '@/lib/content/demo-data'
import { clubPageSchema } from '@/lib/content/types'
import { findPlaceholders } from '@/lib/placeholders'
import { buildDrafterPrompt } from './prompt'
import { draftOutputSchema } from './schema'
import {
  ClubHasPageError,
  describePath,
  draftClubPage,
  DraftGenerationError,
  generateDraft,
  studioEditPath,
} from './service'

const moorgate = demoClubs[1]!
const brief = 'Announce the conversion and lead with recovery and the reformer studio.'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const reply = (text: string) => ({
  content: [{ type: 'text' as const, text }],
  finishReason: { unified: 'stop' as const, raw: undefined },
  usage,
  warnings: [],
})

beforeEach(() => {
  resetDemoStore()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('generateDraft', () => {
  it('retries once after invalid output, then returns a clear error', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [reply('{"title": "Missing everything else"}'), reply('not json at all')],
    })
    const error = await generateDraft({ club: moorgate, brief, tone: 'calm' }, model).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(DraftGenerationError)
    expect((error as Error).message).toMatch(/did not pass validation twice, so nothing was saved/)
    expect(model.doGenerateCalls).toHaveLength(2)
  })

  it('succeeds on the retry when the second answer is valid', async () => {
    const good = JSON.stringify(mockDraftFor(buildDrafterPrompt(moorgate, brief, 'calm')))
    const model = new MockLanguageModelV4({ doGenerate: [reply('{"oops": true}'), reply(good)] })
    const { attempts, draft } = await generateDraft({ club: moorgate, brief, tone: 'calm' }, model)
    expect(attempts).toBe(2)
    expect(draftOutputSchema.safeParse(draft).success).toBe(true)
  })

  it('rejects prices that are neither numbers nor placeholders', () => {
    const draft = mockDraftFor(buildDrafterPrompt(moorgate, brief, 'calm')) as {
      rates: { plans: Array<{ pricePerMonth: string }> }
    }
    draft.rates.plans[0]!.pricePerMonth = 'about £200'
    expect(draftOutputSchema.safeParse(draft).success).toBe(false)
  })

  it('sends only the club facts and the brief to the model', async () => {
    const model = createMockDrafterModel()
    await generateDraft({ club: moorgate, brief, tone: 'premium' }, model)
    const prompt = userText(model.doGenerateCalls[0]!.prompt)
    expect(prompt).toContain('"name": "Linden Moorgate"')
    expect(prompt).not.toContain(moorgate.phone)
    expect(prompt).not.toContain('Linden Mayfair')
    expect(prompt).toContain('Tone: premium')
  })
})

describe('draftClubPage', () => {
  const deps = () => ({ repository: demoRepository, model: createMockDrafterModel })

  it('creates an unpublished draft with flagged placeholders and a Studio link', async () => {
    const createDraft = vi.spyOn(demoRepository, 'createDraftClubPage')
    const result = await draftClubPage({ clubId: MOORGATE_ID, brief, tone: 'calm' }, deps())

    expect(result.draftId).toMatch(/^drafts\./)
    expect(result.studioPath).toBe(studioEditPath(result.draftId))
    expect(result.placeholders.map((p) => p.kind)).toEqual(
      expect.arrayContaining(['DATE', 'PRICE']),
    )

    const saved = createDraft.mock.calls[0]![0]
    expect(saved.clubId).toBe(MOORGATE_ID)
    expect(saved.blocks.map((b) => b._type)).toEqual([
      'heroBlock',
      'facilitiesBlock',
      'spaRecoveryBlock',
      'ratesBlock',
      'tourBookingBlock',
      'faqBlock',
    ])
    // The page cannot be published while these remain (the Studio rule uses the same finder).
    expect(findPlaceholders(saved).length).toBeGreaterThan(0)
    // And the draft still renders through the page view model.
    expect(
      clubPageSchema.safeParse({
        _id: 'x',
        title: saved.title,
        club: moorgate,
        blocks: saved.blocks,
      }).success,
    ).toBe(true)
  })

  it('refuses clubs that already have a page', async () => {
    await expect(
      draftClubPage({ clubId: MAYFAIR_ID, brief, tone: 'calm' }, deps()),
    ).rejects.toBeInstanceOf(ClubHasPageError)
  })
})

describe('describePath', () => {
  it('turns document paths into editor-friendly locations', () => {
    const types = ['heroBlock', 'facilitiesBlock', 'spaRecoveryBlock', 'ratesBlock']
    expect(describePath('blocks[3].plans[0].pricePerMonth', types)).toBe(
      'Rates › Plans 1 › Price per month',
    )
    expect(describePath('blocks[0].subheading', types)).toBe('Hero › Subheading')
    expect(describePath('seo.description', types)).toBe('SEO › Description')
  })
})

describe('studioEditPath', () => {
  it('opens the draft via the published id', () => {
    expect(studioEditPath('drafts.abc-123')).toBe('/studio/intent/edit/id=abc-123;type=clubPage/')
  })
})
