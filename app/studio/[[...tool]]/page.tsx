import { NextStudio } from 'next-sanity/studio'
import config from '@/sanity.config'
import { isSanityConfigured } from '@/sanity/env'
import { StudioNotConfigured } from './StudioNotConfigured'

export const dynamic = 'force-static'

export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  if (!isSanityConfigured) return <StudioNotConfigured />
  return <NextStudio config={config} />
}
