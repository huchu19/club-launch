/** Working platform name (docs/DESIGN.md). Change it here only. */
export const PLATFORM_NAME = 'Club Launch'

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

export const site = {
  name: PLATFORM_NAME,
  tagline: 'Launch a social wellness club page from tested, pre-built blocks.',
  description:
    'A CMS-driven platform for launching social wellness club pages, with AI helpers that always keep an editor in control.',
  url: resolveSiteUrl(),
}

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`
}
