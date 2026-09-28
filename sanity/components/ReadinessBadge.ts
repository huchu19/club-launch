import type { DocumentBadgeComponent } from 'sanity'
import { useReadiness } from '../readiness'

/** "Ready 100%" / "Ready 71%" on club pages, with what's missing as the tooltip. */
export const ReadinessBadge: DocumentBadgeComponent = (props) => {
  const doc = (props.draft ?? props.published) as Parameters<typeof useReadiness>[0]
  const readiness = useReadiness(doc)
  if (!readiness) return null
  const missing = readiness.checks.filter((c) => !c.ok).map((c) => c.label)
  return {
    label: `Ready ${readiness.score}%`,
    title: missing.length ? `Still to do: ${missing.join(', ')}` : 'Ready to launch',
    color: readiness.score === 100 ? 'success' : 'warning',
  }
}
