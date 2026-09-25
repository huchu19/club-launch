import type { Club } from '@/lib/content/types'
import { groupOpeningHours } from '@/lib/format'

export type GroundingFaq = { question: string; answer: string }

/**
 * The only information the FAQ model may use (docs/SPEC.md §5): this club's
 * own document and its approved FAQs. Nothing about other clubs, no pending
 * answers, and never any form submissions or personal data.
 */
export function buildGroundingContext(club: Club, approvedFaqs: GroundingFaq[]): string {
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

  if (club.facilities.length) {
    lines.push(
      '',
      'Facilities:',
      ...club.facilities.map(
        (f) => `- ${f.name} (${f.category})${f.description ? `: ${f.description}` : ''}`,
      ),
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
