// Story-only fixtures built from the same demo data the app and seed use.
import type { DayPlanView } from '@/lib/concierge/protocol'
import { demoClubs, demoFaqs, demoPages } from '@/lib/content/demo-data'
import type { Club, PageBlock, PublicFaq } from '@/lib/content/types'
import { FAQ_HEADERS, type FaqAnswerStatus } from '@/lib/faq/protocol'
import { groupOpeningHours } from '@/lib/format'
import type { TourClubDetails } from './TourBookingBlock'

export const mayfair = demoClubs[0] as Club

export const mayfairPage = demoPages[0]!

export function blockOf<T extends PageBlock['_type']>(type: T) {
  const block = mayfairPage.blocks.find((b) => b._type === type)
  if (!block) throw new Error(`No ${type} in demo page`)
  return block as Extract<PageBlock, { _type: T }>
}

export const mayfairFaqs: PublicFaq[] = demoFaqs
  .filter((f) => f.clubId === mayfair._id && f.status === 'approved')
  .map(({ _id, question, answer }) => ({ _id, question, answer }))

export const tourClub: TourClubDetails = {
  name: mayfair.name,
  slug: mayfair.slug,
  address: `${mayfair.address.streetAddress}, ${mayfair.address.locality} ${mayfair.address.postalCode}`,
  phone: mayfair.phone,
  openingHours: groupOpeningHours(mayfair.openingHours),
}

/** A text/plain streaming Response like /api/faq returns. */
export function streamingAnswer(
  text: string,
  {
    status = 'pending',
    id = 'faq-story-new',
    delayMs = 15,
  }: {
    status?: FaqAnswerStatus
    id?: string
    delayMs?: number
  } = {},
): Response {
  const encoder = new TextEncoder()
  const words = text.split(/(?<= )/)
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word))
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      [FAQ_HEADERS.status]: status,
      [FAQ_HEADERS.id]: id,
      [FAQ_HEADERS.source]: status === 'fallback' ? 'fallback' : 'model',
    },
  })
}

/** A first-day plan as /api/concierge returns it. */
export const samplePlan: DayPlanView = {
  id: 'storyplan0000001',
  clubName: mayfair.name,
  day: 'Wednesday',
  summary: 'A balanced Wednesday at Linden Mayfair, planned around your working day.',
  stops: [
    {
      time: '08:00',
      spaceId: 'movement-studio',
      spaceName: 'Movement studio',
      className: 'Vinyasa yoga',
      activity: 'Vinyasa yoga',
      reason: 'You start the day moving, in a class that suits how you like to train.',
    },
    {
      time: '10:00',
      spaceId: 'workspace',
      spaceName: "Members' workspace",
      activity: 'Settle in for focused work',
      reason: 'You get a quiet desk for the morning, with booths for calls.',
    },
    {
      time: '13:00',
      spaceId: 'garden-kitchen',
      spaceName: 'Garden kitchen',
      activity: 'Lunch in the garden kitchen',
      reason: 'You break the day with a seasonal lunch in the garden.',
    },
    {
      time: '17:30',
      spaceId: 'contrast-therapy',
      spaceName: 'Contrast therapy',
      className: 'Guided contrast circuit',
      activity: 'Guided contrast circuit',
      reason: 'You wind down with a guided hot and cold circuit as the day slows.',
    },
    {
      time: '18:30',
      spaceId: 'thermal-suite',
      spaceName: 'Thermal suite',
      activity: 'Time in the thermal suite',
      reason: 'You end the day warm and unhurried, looking out onto the garden.',
    },
  ],
  recommendedPlan: { name: 'Club and workspace', pricePerMonth: '325', joiningFee: '150' },
  caveats: [],
}
