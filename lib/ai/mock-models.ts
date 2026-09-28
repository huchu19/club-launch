import { APICallError, simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { mentionsHealth } from '@/lib/concierge/prompt'
import type { PlanOutput } from '@/lib/concierge/schema'
import { weekdays, type ScheduleEntry } from '@/lib/content/types'
import { normalizeQuestion } from '@/lib/faq/normalize'
import { refusalText } from '@/lib/faq/prompt'

// Deterministic stand-ins for Gemini when AI_MOCK=1 (always in CI and e2e).
// They run through the real AI SDK code paths (streamText, generateText with
// structured output), so only the network call is replaced.

type MockPrompt = Parameters<MockLanguageModelV4['doStream']>[0]['prompt']

const usage = {
  inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 60, text: 60, reasoning: undefined },
}

/** The concatenated text of the user messages in a prompt. */
export function userText(prompt: MockPrompt): string {
  return prompt
    .filter((m) => m.role === 'user')
    .flatMap((m) => (m.role === 'user' ? m.content : []))
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('\n')
}

export function between(text: string, tag: string): string {
  const match = new RegExp(`<${tag}>\\n?([\\s\\S]*?)\\n?</${tag}>`).exec(text)
  return match?.[1]?.trim() ?? ''
}

// ---------------------------------------------------------------------------
// FAQ fixtures: an in-context answer, an out-of-context refusal, a quota error.
// ---------------------------------------------------------------------------

/** Ask a question containing this word to simulate an exhausted Gemini quota. */
export const MOCK_QUOTA_TRIGGER = 'quota'

const SENSITIVE =
  /\b(medical|medicine|medication|doctor|injur\w*|pain|pregnan\w*|diagnos\w*|symptom\w*|physio\w*|prescri\w*|blood pressure|heart condition|lose weight|member (list|names?|details)|who (else )?is a member|home address|personal (data|details))\b/i
const PRICE = /\b(price|prices|cost|costs|how much|fee|fees|discount|offer|deal)\b|£/i
const STOPWORDS = new Set(
  'the and for are there is do does can you your what when how have has with this that club about any a an of to in on at i it be or my me we our will would could should please get use there here its from'.split(
    ' ',
  ),
)

function keywords(text: string): Set<string> {
  return new Set(
    normalizeQuestion(text)
      .split(' ')
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)),
  )
}

type Candidate = { text: string; haystack: Set<string> }

function candidates(context: string): Candidate[] {
  const lines = context.split('\n')
  const found: Candidate[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.startsWith('- ')) {
      const body = line.slice(2)
      const value = body.includes(': ') ? body.slice(body.indexOf(': ') + 2) : body
      found.push({ text: value, haystack: keywords(body) })
    } else if (line.startsWith('Q: ') && lines[i + 1]?.startsWith('A: ')) {
      const answer = (lines[i + 1] ?? '').slice(3)
      found.push({ text: answer, haystack: keywords(`${line.slice(3)} ${answer}`) })
    }
  }
  return found
}

export type MockFaqOutcome = { kind: 'quota' } | { kind: 'answer' | 'refusal'; text: string }

/** Pure decision logic of the FAQ mock, exported for tests. */
export function mockFaqOutcome(promptText: string): MockFaqOutcome {
  const context = between(promptText, 'club_information')
  const question = between(promptText, 'visitor_question')
  const clubName = /^Club: (.+)$/m.exec(context)?.[1] ?? 'the club'
  const refusal = { kind: 'refusal' as const, text: refusalText(clubName) }

  if (new RegExp(`\\b${MOCK_QUOTA_TRIGGER}\\b`, 'i').test(question)) return { kind: 'quota' }
  if (SENSITIVE.test(question)) return refusal

  const wanted = keywords(question)
  let best: { candidate: Candidate; score: number } | undefined
  for (const candidate of candidates(context)) {
    const score = [...wanted].filter((w) => candidate.haystack.has(w)).length
    if (score > (best?.score ?? 0)) best = { candidate, score }
  }
  if (!best) return refusal
  // A price question is only answered when the matched fact states a price.
  if (PRICE.test(question) && !best.candidate.text.includes('£')) return refusal

  const fact = best.candidate.text.trim().replace(/([^.!?])$/, '$1.')
  return {
    kind: 'answer',
    text: `${fact} If you would like to see it for yourself, you are very welcome to book a tour.`,
  }
}

export function createMockFaqModel(chunkDelayInMs = 12): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'mock-faq',
    doStream: async ({ prompt }) => {
      const outcome = mockFaqOutcome(userText(prompt))
      if (outcome.kind === 'quota') {
        throw new APICallError({
          message: 'Resource has been exhausted (e.g. check quota).',
          url: 'mock://gemini',
          requestBodyValues: {},
          statusCode: 429,
          isRetryable: false,
        })
      }
      const words = outcome.text.split(/(?<= )/)
      return {
        stream: simulateReadableStream({
          chunkDelayInMs,
          chunks: [
            { type: 'text-start' as const, id: 't' },
            ...words.map((delta) => ({ type: 'text-delta' as const, id: 't', delta })),
            { type: 'text-end' as const, id: 't' },
            {
              type: 'finish' as const,
              finishReason: { unified: 'stop' as const, raw: undefined },
              usage,
            },
          ],
        }),
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Page drafter fixture: a complete draft built from the club facts in the
// prompt, with placeholders for every price and date.
// ---------------------------------------------------------------------------

type PromptClub = {
  name: string
  status: string
  address?: { locality?: string }
  facilities?: Array<{ name: string; category: string; description?: string }>
}

export function mockDraftFor(promptText: string): unknown {
  const club = JSON.parse(between(promptText, 'club_facts') || '{}') as PromptClub
  const tone = /Tone: (\w+)/.exec(promptText)?.[1] ?? 'calm'
  const place = club.address?.locality?.split(',')[0] ?? 'the city'
  const facilities = club.facilities ?? []
  const recovery = facilities.filter((f) => f.category === 'spa' || f.category === 'recovery')
  const lead = {
    calm: 'A quieter place to train and recover',
    energetic: 'Train harder, recover smarter',
    premium: 'A members’ club for training, recovery and work',
  }[tone as 'calm' | 'energetic' | 'premium']

  return {
    title: club.name,
    seo: {
      title: `${club.name}: a social wellness club in ${place}`,
      description: `${club.name} is becoming a social wellness club, opening [[DATE: opening date]].`,
    },
    hero: {
      eyebrow: `${place} · ${club.status === 'coming-soon' ? 'Coming soon' : 'Now open'}`,
      heading: `${lead} in ${place}`,
      subheading: `${club.name} is being reimagined as a social wellness club, opening [[DATE: opening date]].`,
      ctaLabel: 'Book a preview tour',
    },
    facilities: {
      heading: 'What’s inside',
      intro: `Everything at ${club.name}, designed to be used in a single visit.`,
    },
    spaRecovery: {
      eyebrow: 'The garden',
      heading: 'Recovery, built in',
      intro: 'Heat, cold and quiet, a few steps from the training floor.',
      items: (recovery.length ? recovery : facilities.slice(0, 2)).slice(0, 3).map((f) => ({
        name: f.name,
        description: f.description ?? f.name,
      })),
    },
    rates: {
      heading: 'Founding membership',
      plans: [
        {
          name: 'Founding member',
          pricePerMonth: '[[PRICE: founding monthly membership]]',
          joiningFee: '[[PRICE: joining fee]]',
          inclusions: facilities.slice(0, 3).map((f) => f.name),
        },
      ],
      note: 'Founding rates are available until [[DATE: founding offer end date]].',
    },
    tourBooking: {
      heading: 'See it before anyone else',
      intro: 'Book a preview tour and the team will show you around.',
    },
    faq: { heading: 'Questions', intro: 'Ask anything about the new club.' },
  }
}

export function createMockDrafterModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'mock-drafter',
    doGenerate: async ({ prompt }) => ({
      content: [{ type: 'text', text: JSON.stringify(mockDraftFor(userText(prompt))) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage,
      warnings: [],
    }),
  })
}

// ---------------------------------------------------------------------------
// Concierge fixtures: a normal plan, a health mention with a caveat, an
// invalid-then-valid reply, an off-topic message and a quota error. Plans are
// built from the club context in the prompt, so they use the real timetable.
// ---------------------------------------------------------------------------

/** A message containing this word gets an invalid plan first, then a valid one on retry. */
export const MOCK_RETRY_TRIGGER = 'retry'

const OFF_TOPIC =
  /\b(ignore (all|your|the|previous)|poem|recipe|joke|essay|homework|bitcoin|write (me )?(some )?code)\b/i

type PromptSpace = {
  id: string
  category: string
  openingHours?: Array<{ day: string; opens: string; closes: string }>
}
type PromptContext = {
  club?: string
  openingHours?: Array<{ day: string; opens: string; closes: string }>
  spaces?: PromptSpace[]
  schedule?: ScheduleEntry[]
  plans?: Array<{ name: string }>
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const toTime = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
/** Minutes after `time`, rounded up to the next half hour. */
const laterBy = (time: string, minutes: number) =>
  toTime(Math.ceil((toMinutes(time) + minutes) / 30) * 30)

/** Pure decision logic of the concierge mock, exported for tests. */
export function mockConciergePlan(promptText: string): PlanOutput {
  const context = JSON.parse(between(promptText, 'club_context') || '{}') as PromptContext
  const text = `${between(promptText, 'visitor_message')} ${between(promptText, 'chosen_options')}`
  const lower = text.toLowerCase()
  const retrying = promptText.includes('<problems_with_previous_plan>')

  const works = /\b(work|desk|laptop|calls?|meetings?)\b/.test(lower)
  const event = /\b(event|marathon|race|triathlon|half)\b/.test(lower)
  const health = mentionsHealth(text)
  const gentle = health || /\b(unwind|relax|stress\w*|slow|calm|tired)\b/.test(lower)
  const day =
    weekdays.find((d) => lower.includes(d.toLowerCase())) ?? (event ? 'Saturday' : 'Wednesday')

  const spaces = context.spaces ?? []
  const byCategory = (category: string) => spaces.find((s) => s.category === category)
  const today = (context.schedule ?? [])
    .filter((entry) => entry.day === day)
    .sort((a, b) => a.time.localeCompare(b.time))
  const open = (spaceId: string, time: string) => {
    const space = spaces.find((s) => s.id === spaceId)
    const hours =
      space?.openingHours?.find((h) => h.day === day) ??
      context.openingHours?.find((h) => h.day === day)
    return Boolean(hours && time >= hours.opens && time < hours.closes)
  }

  const stops: PlanOutput['stops'] = []
  const addClass = (entry: ScheduleEntry | undefined, reason: string) => {
    if (entry) {
      stops.push({
        time: entry.time,
        spaceId: entry.spaceId,
        className: entry.name,
        activity: entry.name,
        reason,
      })
    }
  }
  const addSpace = (category: string, time: string, activity: string, reason: string) => {
    const space = byCategory(category)
    if (space && open(space.id, time) && !stops.some((s) => s.time === time)) {
      stops.push({ time, spaceId: space.id, className: '', activity, reason })
    }
  }

  const morning = today.filter((e) => e.time >= '07:00' && e.time < '11:00')
  const wanted = event ? 'high' : gentle ? 'low' : 'medium'
  const first = morning.find((e) => e.intensity === wanted) ?? morning[0]
  addClass(
    first,
    gentle
      ? 'You start slowly, with an unhurried class that eases you into the day.'
      : 'You start the day moving, in a class that suits how you like to train.',
  )

  const lateMorning = first ? laterBy(first.time, first.durationMin + 30) : '10:00'
  const midMorning = lateMorning > '10:00' ? lateMorning : '10:00'
  if (works) {
    addSpace(
      'cowork',
      midMorning,
      'Settle in for focused work',
      'You get a quiet desk for the morning, with booths for calls.',
    )
  } else {
    addSpace(
      'pool',
      midMorning,
      'An easy swim',
      'You loosen off with a few calm lengths while the pool is quiet.',
    )
  }
  addSpace(
    'food',
    '13:00',
    'Lunch in the garden kitchen',
    'You break the day with a seasonal lunch in the garden.',
  )

  const evening = today.filter((e) => e.time >= '16:00')
  const last = evening.find((e) => e.intensity === (event ? 'high' : 'low')) ?? evening[0]
  addClass(
    last,
    event
      ? 'You finish with a session that builds towards your event.'
      : 'You wind down with a guided session as the day slows.',
  )
  if (last) {
    addSpace(
      'spa',
      laterBy(last.time, last.durationMin + 15),
      'Time in the thermal suite',
      'You end the day warm and unhurried, looking out onto the garden.',
    )
  }
  if (stops.length < 4) {
    addSpace('spa', '15:00', 'Time in the thermal suite', 'You take a quiet hour to recover.')
  }
  stops.sort((a, b) => a.time.localeCompare(b.time))

  if (lower.includes(MOCK_RETRY_TRIGGER) && !retrying && stops[0]) {
    stops[0] = { ...stops[0], spaceId: 'rooftop-bar' }
  }

  const plans = context.plans ?? []
  const plan = (works && plans.find((p) => /workspace/i.test(p.name))) || plans[0]
  const character = gentle ? 'gentle' : event ? 'purposeful' : 'balanced'
  return {
    offTopic: OFF_TOPIC.test(text),
    day,
    summary: `A ${character} ${day} at ${context.club ?? 'the club'}${works ? ', planned around your working day' : ''}.`,
    stops: stops.slice(0, 6),
    recommendedPlanName: plan?.name ?? '',
    caveats: health
      ? [
          'Check with a GP or physiotherapist before starting anything new, and tell the team so they can adapt classes for you.',
        ]
      : [],
  }
}

export function createMockConciergeModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'mock-concierge',
    doGenerate: async ({ prompt }) => {
      const text = userText(prompt)
      if (new RegExp(`\\b${MOCK_QUOTA_TRIGGER}\\b`, 'i').test(between(text, 'visitor_message'))) {
        throw new APICallError({
          message: 'Resource has been exhausted (e.g. check quota).',
          url: 'mock://gemini',
          requestBodyValues: {},
          statusCode: 429,
          isRetryable: false,
        })
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(mockConciergePlan(text)) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        warnings: [],
      }
    },
  })
}
