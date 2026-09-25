import type { FacilityCategory } from '@/lib/content/types'

const paths: Record<FacilityCategory, React.ReactNode> = {
  gym: (
    <>
      <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />
    </>
  ),
  spa: (
    <>
      <path d="M8 4c-1 2 1 3 0 5M12 3c-1 2 1 3 0 5M16 4c-1 2 1 3 0 5" />
      <path d="M4 13h16a8 8 0 0 1-16 0z" />
    </>
  ),
  recovery: (
    <>
      <path d="M12 21c-6-4-6-11 0-17 6 6 6 13 0 17z" />
      <path d="M12 20V9" />
    </>
  ),
  pool: (
    <>
      <path d="M3 14c2 0 2-1.5 4.5-1.5S9.5 14 12 14s2-1.5 4.5-1.5S19 14 21 14" />
      <path d="M3 18.5c2 0 2-1.5 4.5-1.5s2 1.5 4.5 1.5 2-1.5 4.5-1.5 2.5 1.5 4.5 1.5" />
      <path d="M8 11V5.5a2 2 0 0 1 4 0M16 11V5.5a2 2 0 0 0-4 0" />
    </>
  ),
  cowork: (
    <>
      <rect x="4" y="5" width="16" height="10" rx="1.5" />
      <path d="M2 19h20" />
    </>
  ),
  studio: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v6M7 10l5 3 5-3M9 20l3-7 3 7" />
    </>
  ),
  food: (
    <>
      <path d="M5 10h12v2a6 6 0 0 1-12 0z" />
      <path d="M17 11h1.5a2 2 0 0 1 0 4H16M8 3c-.8 1.5.8 2.5 0 4M12 3c-.8 1.5.8 2.5 0 4" />
    </>
  ),
}

export const facilityCategoryLabels: Record<FacilityCategory, string> = {
  gym: 'Gym',
  spa: 'Spa',
  recovery: 'Recovery',
  pool: 'Pool',
  cowork: 'Co-working',
  studio: 'Studio',
  food: 'Food and drink',
}

export function FacilityIcon({
  category,
  className,
}: {
  category: FacilityCategory
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[category]}
    </svg>
  )
}
