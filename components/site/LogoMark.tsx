/** An arch framing a single leaf: the studio → garden motif, drawn as cut paper. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <path d="M5 29V15a11 11 0 0 1 22 0v14z" fill="currentColor" opacity="0.18" />
      <path
        d="M5 29V15a11 11 0 0 1 22 0v14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M16 27c-5-3.5-5.5-9.5 0-15 5.5 5.5 5 11.5 0 15z" fill="currentColor" />
      <path d="M16 26V15.5" stroke="var(--color-canvas)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
