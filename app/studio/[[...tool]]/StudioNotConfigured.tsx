import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import '../../globals.css'

/** Shown at /studio when no Sanity project is configured (e.g. demo-content mode). */
export function StudioNotConfigured() {
  return (
    <main className="min-h-screen bg-canvas">
      <Container className="max-w-2xl py-section">
        <Eyebrow>Editor studio</Eyebrow>
        <Heading level={1} size="xl">
          The studio needs a Sanity project.
        </Heading>
        <p className="mt-6 text-lg text-ink-muted">
          Set <code className="font-mono text-base">NEXT_PUBLIC_SANITY_PROJECT_ID</code> and the
          dataset variables (see <code className="font-mono text-base">.env.example</code>), then
          restart the server. Until then the site serves its bundled demo content.
        </p>
        <div className="mt-8">
          <ButtonLink href="/" variant="secondary">
            Back to the site
          </ButtonLink>
        </div>
      </Container>
    </main>
  )
}
