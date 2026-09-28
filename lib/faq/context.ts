import type { PageOffers } from '@/lib/content/rate-plans'
import { facilitiesOf, type Club } from '@/lib/content/types'
import { formatMoney, groupOpeningHours } from '@/lib/format'

export type GroundingFaq = { question: string; answer: string }

/**
 * The only information the FAQ model may use (docs/SPEC.md §5): this club's
 * own document and its approved FAQs. Nothing about other clubs, no pending
 * answers, and never any form submissions or personal data.
 */
export function buildGroundingContext(
  club: Club,
  approvedFaqs: GroundingFaq[],
  offers: PageOffers = { plans: [] },
): string {
  const money = (amount: number) => formatMoney(amount, club.market.locale, club.market.currency)
  const lines: string[] = [
    `Club: ${club.name}`,
    `Status: ${club.status === 'open' ? 'Open' : 'Coming soon'}`,
    `Address: ${club.address.streetAddress}, ${club.address.locality} ${club.address.postalCode}`,
  ]
  if (club.phone) lines.push(`Phone: ${club.phone}`)

  const hours = groupOpeningHours(club.openingHours)
  if (hours.length) {
    lines.push('', 'Opening hours:', ...hours.map((h) => `- ${h.days}: ${h.hours}`))
  }

  const facilities = facilitiesOf(club)
  if (facilities.length) {
    lines.push(
      '',
      'Facilities:',
      ...facilities.map(
        (f) => `- ${f.name} (${f.category})${f.description ? `: ${f.description}` : ''}`,
      ),
    )
  }

  // Prices come from the page's own offers: the club's facts never repeat them.
  if (offers.plans.length) {
    lines.push(
      '',
      'Membership plans:',
      ...offers.plans.map(
        (plan) =>
          `- ${plan.name}: ${money(plan.pricePerMonth)} per month, ${
            plan.joiningFee ? `joining fee ${money(plan.joiningFee)}` : 'no joining fee'
          }`,
      ),
    )
  }
  if (offers.founding) {
    const fee = Number(offers.founding.joiningFee)
    lines.push(
      '',
      `Founding membership: ${money(Number(offers.founding.pricePerMonth))} per month, ${
        fee ? `joining fee ${money(fee)}` : 'no joining fee'
      }, ${offers.founding.totalPlaces} places in total. ${offers.founding.offer}`,
    )
  }

  if (club.facts.length) {
    lines.push('', 'Facts:', ...club.facts.map((f) => `- ${f.label}: ${f.value}`))
  }

  if (approvedFaqs.length) {
    lines.push('', 'Answered questions:')
    for (const faq of approvedFaqs) lines.push(`Q: ${faq.question}`, `A: ${faq.answer}`)
  }

  return lines.join('\n')
}
