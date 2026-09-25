import { leadSchema, type CrmAdapter, type Lead } from './adapter'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function tourReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `TOUR-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`
}

/**
 * Validates the lead and logs one redacted line: no name, email or phone ever
 * reaches the logs.
 */
export class MockCrmAdapter implements CrmAdapter {
  readonly name = 'mock'

  async submitLead(lead: Lead): Promise<{ id: string }> {
    const valid = leadSchema.parse(lead)
    const id = tourReference()
    console.info(
      `[crm:mock] lead ${id} club=${valid.clubSlug} date=${valid.preferredDate} slot=${valid.timeSlot} phone=${valid.phone ? 'yes' : 'no'}`,
    )
    return { id }
  }
}
