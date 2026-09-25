// Public Sanity settings. Safe for the browser (the embedded Studio reads them).
// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them.

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'

/** True when a syntactically valid Sanity project id is configured. */
export const isSanityConfigured = /^[a-z0-9-]+$/.test(projectId)
