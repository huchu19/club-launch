import 'server-only'
import { createClient, type SanityClient } from 'next-sanity'
import { serverEnv } from '@/lib/env'
import { apiVersion, dataset, projectId } from '@/sanity/env'

// All reads are server-side with a token: the dataset is private (docs/SPEC.md §9).

let readClient: SanityClient | undefined
let writeClient: SanityClient | undefined

/** Published-perspective reader. `useCdn: false` so webhook revalidation sees fresh data. */
export function getReadClient(): SanityClient {
  readClient ??= createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    perspective: 'published',
    token: serverEnv().SANITY_API_READ_TOKEN,
  })
  return readClient
}

/** Writer for FAQ candidates and AI drafts. Never used to publish. */
export function getWriteClient(): SanityClient {
  const token = serverEnv().SANITY_API_WRITE_TOKEN
  if (!token) throw new Error('SANITY_API_WRITE_TOKEN is not set')
  writeClient ??= createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    perspective: 'raw',
    token,
  })
  return writeClient
}
