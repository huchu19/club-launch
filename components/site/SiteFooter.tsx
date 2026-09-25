import { Container } from '@/components/ui/Container'
import { TextLink } from '@/components/ui/TextLink'
import { PLATFORM_NAME } from '@/lib/site'
import { LogoMark } from './LogoMark'

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <Container className="grid gap-8 py-12 text-sm text-ink-muted sm:grid-cols-[1fr_auto]">
        <div className="max-w-md space-y-3">
          <p className="flex items-center gap-2 font-display text-lg text-ink">
            <LogoMark className="size-6 text-brand" />
            {PLATFORM_NAME}
          </p>
          <p>
            A demonstration platform for launching social wellness club pages. Clubs, staff and
            imagery are fictional.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2">
            <li>
              <TextLink href="/studio" muted>
                Editor studio
              </TextLink>
            </li>
            <li>
              <TextLink href="/admin/draft" muted>
                AI page drafter
              </TextLink>
            </li>
            <li>
              <TextLink href="/sitemap.xml" muted prefetch={false}>
                Sitemap
              </TextLink>
            </li>
          </ul>
        </nav>
      </Container>
    </footer>
  )
}
