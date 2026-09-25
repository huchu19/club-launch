import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { site } from '@/lib/site'

export default function HomePage() {
  return (
    <Container className="py-section">
      <Eyebrow>{site.name}</Eyebrow>
      <Heading level={1}>Launch a club page in an afternoon.</Heading>
      <p className="mt-6 max-w-2xl text-lg text-ink-muted">{site.tagline}</p>
    </Container>
  )
}
