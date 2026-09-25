// Story-only fixtures built from the same demo data the app and seed use.
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
