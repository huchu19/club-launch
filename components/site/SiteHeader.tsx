import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { TextLink } from '@/components/ui/TextLink'
import { PLATFORM_NAME } from '@/lib/site'
import { LogoMark } from './LogoMark'

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <Container className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm font-display text-xl font-medium tracking-tight text-ink"
        >
          <LogoMark className="size-7 text-brand" />
          {PLATFORM_NAME}
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-6 text-base">
            <li>
              <TextLink href="/#clubs" muted className="no-underline hover:underline">
                Clubs
              </TextLink>
            </li>
            <li>
              <TextLink href="/studio" muted className="no-underline hover:underline">
                For editors
              </TextLink>
            </li>
          </ul>
        </nav>
      </Container>
    </header>
  )
}
