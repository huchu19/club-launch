import 'server-only'
import { createGoogle } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'
import { serverEnv } from '@/lib/env'
import { createMockDrafterModel, createMockFaqModel } from './mock-models'

export class AiUnavailableError extends Error {}

function gemini(): LanguageModel {
  const env = serverEnv()
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new AiUnavailableError('GOOGLE_GENERATIVE_AI_API_KEY is not set')
  }
  return createGoogle({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })(env.GEMINI_MODEL)
}

/** Gemini, or deterministic fixtures when AI_MOCK=1. */
export function getFaqModel(): LanguageModel {
  return serverEnv().AI_MOCK ? createMockFaqModel() : gemini()
}

export function getDrafterModel(): LanguageModel {
  return serverEnv().AI_MOCK ? createMockDrafterModel() : gemini()
}
