import { serverEnv } from '@/lib/env'
import type { CrmAdapter } from './adapter'
import { MockCrmAdapter } from './mock'

export {
  submitLeadWithRetry,
  withOneRetry,
  type FoundingMember,
  type CrmAdapter,
  type Lead,
  type LeadDayPlan,
  type LeadSubmission,
} from './adapter'

/** Chosen by CRM_ADAPTER (default "mock"). */
export function getCrmAdapter(): CrmAdapter {
  switch (serverEnv().CRM_ADAPTER) {
    case 'mock':
      return new MockCrmAdapter()
  }
}
