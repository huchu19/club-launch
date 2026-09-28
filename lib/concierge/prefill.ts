// Lets another block (the club map's "Add to my day") start the first-day
// planner with a space in mind. In-page only: nothing is stored.

type Listener = (text: string) => void
const listeners = new Set<Listener>()

export function onConciergePrefill(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function prefillConcierge(text: string): void {
  listeners.forEach((listener) => listener(text))
}
