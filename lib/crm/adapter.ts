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

/**
 * The visitor's planned first day, when they booked from it: what the tour
 * guide sees about their interests. Built from the stored plan, never from the
 * visitor's own words.
 */
export type LeadDayPlan = {
  id: string
  day: string
  summary: string
  stops: Array<{ time: string; space: string; activity: string }>
  recommendedPlanName?: string
}

export type LeadSubmission = { lead: Lead; dayPlan?: LeadDayPlan }

/** Someone taking a founding member place at a club that hasn't opened yet. */
export const foundingMemberSchema = z.object({
  clubSlug: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  consentedAt: z.iso.datetime(),
})
export type FoundingMember = z.infer<typeof foundingMemberSchema>

/** Where tour requests go. v1 ships a mock; a real CRM implements the same shape. */
export interface CrmAdapter {
  readonly name: string
  submitLead(submission: LeadSubmission): Promise<{ id: string }>
  submitFoundingMember(member: FoundingMember): Promise<{ id: string }>
}

/**
 * Submits a lead, retrying once on failure (docs/SPEC.md §4). The second
 * error is rethrown for the caller to turn into a friendly message.
 */
export async function submitLeadWithRetry(
  adapter: CrmAdapter,
  submission: LeadSubmission,
): Promise<{ id: string }> {
  try {
    return await adapter.submitLead(submission)
  } catch (firstError) {
    console.warn(`[crm:${adapter.name}] submit failed, retrying once:`, errorMessage(firstError))
    return adapter.submitLead(submission)
  }
}

/** Any CRM call, retried once on failure; the second error is rethrown. */
export async function withOneRetry<T>(adapterName: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (firstError) {
    console.warn(`[crm:${adapterName}] call failed, retrying once:`, errorMessage(firstError))
    return call()
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
