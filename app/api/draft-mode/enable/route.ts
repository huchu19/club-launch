import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { isDemoContent, serverEnv } from '@/lib/env'
import { getReadClient } from '@/lib/sanity/client'

// Enabled by the Studio's Presentation tool, which signs the request with a
// preview secret that next-sanity verifies against the dataset.
export async function GET(request: Request) {
  const token = serverEnv().SANITY_API_READ_TOKEN
  if (isDemoContent() || !token) {
    return new Response('Preview needs a configured Sanity project.', { status: 404 })
  }
  const { GET: enable } = defineEnableDraftMode({ client: getReadClient().withConfig({ token }) })
  return enable(request)
}
