import { useEffect, useState } from 'react'
import { useClient } from 'sanity'
import { loadReadiness, READINESS_API_VERSION, type Readiness } from './readiness-rule'

export { readinessRule, READINESS_API_VERSION, type Readiness } from './readiness-rule'

type Doc = Parameters<typeof loadReadiness>[1]

/** Readiness for a document in the Studio, refreshed when it changes. */
export function useReadiness(doc: Doc | null | undefined): Readiness | null {
  const client = useClient({ apiVersion: READINESS_API_VERSION })
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const key = doc ? JSON.stringify(doc) : ''
  useEffect(() => {
    if (!doc) return
    let cancelled = false
    const timer = setTimeout(() => {
      loadReadiness(client, doc)
        .then((result) => {
          if (!cancelled) setReadiness(result)
        })
        .catch(() => {})
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // `key` stands in for the document so edits trigger a refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key])
  return doc ? readiness : null
}
