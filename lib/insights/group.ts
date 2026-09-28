import { normalizeQuestion } from '@/lib/faq/normalize'

// Groups near-duplicate visitor questions ("Is there parking?", "Where can I
// park?") by word overlap, without embeddings: small, explainable and free.

const STOPWORDS = new Set(
  (
    'a an the and or but is are was were be been am do does did can could would should will shall ' +
    'may might must i me my we our you your it its this that these those there here of to in on at ' +
    'for from with about as by into any some what when where which who how if then than so just ' +
    'please club linden get got have has had'
  ).split(' '),
)

/** A light stem: enough to match "parking"/"park" and "classes"/"class". */
export function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3)
  if (word.length > 4 && word.endsWith('es') && /(ss|sh|ch|x)es$/.test(word))
    return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

export function questionTokens(question: string): Set<string> {
  return new Set(
    normalizeQuestion(question)
      .split(' ')
      .filter((word) => word.length > 1 && !STOPWORDS.has(word))
      .map(stem),
  )
}

/**
 * Overlap: the share of the shorter question's words that appear in the other,
 * from 0 to 1. "Is there parking?" is fully inside "Is there any car parking
 * nearby?", which a plain shared-over-all score would miss.
 */
export function similarity(a: Set<string>, b: Set<string>): number {
  const smaller = Math.min(a.size, b.size)
  if (smaller === 0) return a.size === b.size ? 1 : 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared++
  return shared / smaller
}

export type Groupable = { question: string; askedCount: number }

export type QuestionGroup<T extends Groupable> = {
  /** The most-asked question in the group, shown as its title. */
  lead: T
  members: T[]
  totalAsked: number
}

/**
 * Greedy grouping: questions are taken most-asked first, and each joins the
 * first group containing a question at least `threshold` similar to it.
 */
export function groupQuestions<T extends Groupable>(
  items: T[],
  threshold = 0.6,
): QuestionGroup<T>[] {
  const groups: Array<{ group: QuestionGroup<T>; tokens: Set<string>[] }> = []
  const ordered = [...items].sort((a, b) => b.askedCount - a.askedCount)
  for (const item of ordered) {
    const tokens = questionTokens(item.question)
    const home = groups.find((g) => g.tokens.some((t) => similarity(t, tokens) >= threshold))
    if (home) {
      home.group.members.push(item)
      home.group.totalAsked += item.askedCount
      home.tokens.push(tokens)
    } else {
      groups.push({
        group: { lead: item, members: [item], totalAsked: item.askedCount },
        tokens: [tokens],
      })
    }
  }
  return groups.map((g) => g.group).sort((a, b) => b.totalAsked - a.totalAsked)
}
