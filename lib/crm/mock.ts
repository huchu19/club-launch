import {
  foundingMemberSchema,
  leadSchema,
  type CrmAdapter,
  type FoundingMember,
  type LeadSubmission,
} from './adapter'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function reference(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `${prefix}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`
}

export const tourReference = () => reference('TOUR')
export const foundingReference = () => reference('FOUND')

/**
 * Validates the lead and logs one redacted line: no name, email or phone ever
 * reaches the logs.
 */
export class MockCrmAdapter implements CrmAdapter {
  readonly name = 'mock'

  async submitLead({ lead, dayPlan }: LeadSubmission): Promise<{ id: string }> {
    const valid = leadSchema.parse(lead)
    const id = tourReference()
    const stops = dayPlan?.stops.length ?? 0
    const plan = dayPlan
      ? ` plan=${dayPlan.id} (${dayPlan.day}, ${stops} stop${stops === 1 ? '' : 's'})`
      : ''
    console.info(
      `[crm:mock] lead ${id} club=${valid.clubSlug} date=${valid.preferredDate} slot=${valid.timeSlot} phone=${valid.phone ? 'yes' : 'no'}${plan}`,
    )
    return { id }
  }

  async submitFoundingMember(member: FoundingMember): Promise<{ id: string }> {
    const valid = foundingMemberSchema.parse(member)
    const id = foundingReference()
    console.info(
      `[crm:mock] founding member ${id} club=${valid.clubSlug} phone=${valid.phone ? 'yes' : 'no'}`,
    )
    return { id }
  }
}
