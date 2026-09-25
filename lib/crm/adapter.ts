import { z } from 'zod'
import { timeSlots } from '@/lib/tour/schema'

export const leadSchema = z.object({
  clubSlug: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.enum(timeSlots),
  consentedAt: z.iso.datetime(),
})

export type Lead = z.infer<typeof leadSchema>

/** Where tour requests go. v1 ships a mock; a real CRM implements the same shape. */
export interface CrmAdapter {
  readonly name: string
  submitLead(lead: Lead): Promise<{ id: string }>
}

/**
 * Submits a lead, retrying once on failure (docs/SPEC.md §4). The second
 * error is rethrown for the caller to turn into a friendly message.
 */
export async function submitLeadWithRetry(
  adapter: CrmAdapter,
  lead: Lead,
): Promise<{ id: string }> {
  try {
    return await adapter.submitLead(lead)
  } catch (firstError) {
    console.warn(`[crm:${adapter.name}] submit failed, retrying once:`, errorMessage(firstError))
    return adapter.submitLead(lead)
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
