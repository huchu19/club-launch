import { z } from 'zod'
import { isSanityConfigured } from '@/sanity/env'

// Empty strings in .env files mean "not set".
const optional = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())
const flag = z.preprocess((v) => v === '1' || v === 'true', z.boolean())

const serverEnvSchema = z.object({
  SANITY_API_READ_TOKEN: optional,
  SANITY_API_WRITE_TOKEN: optional,
  SANITY_REVALIDATE_SECRET: optional,
  CONTENT_MOCK: flag,
  GOOGLE_GENERATIVE_AI_API_KEY: optional,
  GEMINI_MODEL: z.preprocess(
    (v) => (v === '' || v === undefined ? 'gemini-flash-latest' : v),
    z.string(),
  ),
  AI_MOCK: flag,
  ADMIN_USER: optional,
  ADMIN_PASSWORD: optional,
  CRM_ADAPTER: z.preprocess((v) => (v === '' || v === undefined ? 'mock' : v), z.enum(['mock'])),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

/**
 * Parsed server environment. Read on every call (cheap) so tests can change
 * process.env between cases. Never import this from client components.
 */
export function serverEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env)
}

/** Demo content is served when explicitly requested or when Sanity is not configured. */
export function isDemoContent(): boolean {
  return serverEnv().CONTENT_MOCK || !isSanityConfigured
}
