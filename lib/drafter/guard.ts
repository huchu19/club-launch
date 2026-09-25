import type { Club } from '@/lib/content/types'
import { drafterFacts } from './prompt'

// Belt and braces for SPEC §6: any number in the draft that doesn't appear in
// the club's facts is wrapped as [[CHECK: ...]], so publishing stays blocked
// until an editor confirms it. Text inside existing placeholders is untouched.

const PLACEHOLDER = /(\[\[[^\]]*\]\])/
const NUMBER = /£?\d+(?:[.,:]\d+)*%?/g

function numbersIn(text: string): Set<string> {
  return new Set([...text.matchAll(/\d+(?:[.,:]\d+)*/g)].map((m) => m[0]))
}

export function flagUnverifiedNumbers<T>(draft: T, club: Club): { draft: T; flagged: string[] } {
  const known = numbersIn(JSON.stringify(drafterFacts(club)))
  const flagged = new Set<string>()

  const guardText = (text: string) =>
    text
      .split(PLACEHOLDER)
      .map((segment) =>
        PLACEHOLDER.test(segment)
          ? segment
          : segment.replace(NUMBER, (token) => {
              const core = token.replace(/[£%]/g, '')
              if (known.has(core)) return token
              flagged.add(token)
              return `[[CHECK: ${token}]]`
            }),
      )
      .join('')

  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return guardText(value)
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
    }
    return value
  }

  return { draft: walk(draft) as T, flagged: [...flagged] }
}
