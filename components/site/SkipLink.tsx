export function SkipLink({ href = '#main' }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only z-50 rounded-sm bg-brand px-4 py-3 font-medium text-on-brand focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      Skip to content
    </a>
  )
}
