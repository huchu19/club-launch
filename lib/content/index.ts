import 'server-only'
import { isDemoContent } from '@/lib/env'
import { demoRepository } from './demo-repository'
import type { ContentRepository } from './repository'
import { sanityRepository } from './sanity-repository'

/** Sanity when configured; otherwise (or with CONTENT_MOCK=1) the bundled demo content. */
export function getContentRepository(): ContentRepository {
  return isDemoContent() ? demoRepository : sanityRepository
}
