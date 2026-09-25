import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SkipLink } from '@/components/site/SkipLink'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import './globals.css'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Container className="grid min-h-[60vh] items-center gap-12 py-section md:grid-cols-[1.2fr_1fr]">
          <div>
            <Eyebrow>Error 404</Eyebrow>
            <Heading level={1}>This path leads nowhere yet.</Heading>
            <p className="mt-6 max-w-xl text-lg text-ink-muted">
              The page may have moved, or the club may not have launched. Head back to the club
              index to find what you were after.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/" size="lg">
                See all clubs
              </ButtonLink>
            </div>
          </div>
          <svg
            viewBox="0 0 200 220"
            aria-hidden="true"
            className="mx-auto hidden w-full max-w-xs text-brand md:block"
          >
            <path d="M20 210V100a80 80 0 0 1 160 0v110z" fill="currentColor" opacity="0.1" />
            <path
              d="M20 210V100a80 80 0 0 1 160 0v110"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M60 210c10-30 30-40 40-70M140 210c-12-26-28-36-40-70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 8"
              strokeLinecap="round"
            />
            <circle cx="100" cy="128" r="6" fill="var(--color-accent)" />
          </svg>
        </Container>
      </main>
      <SiteFooter />
    </>
  )
}
