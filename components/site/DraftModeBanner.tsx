import { Container } from '@/components/ui/Container'

/** Shown on every page while Sanity draft mode (preview) is enabled. */
export function DraftModeBanner() {
  return (
    <div className="bg-ink text-canvas" role="region" aria-label="Preview mode">
      <Container className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
        <p>You are previewing unpublished changes.</p>
        <form action="/api/draft-mode/disable" method="post">
          <button
            type="submit"
            className="cursor-pointer underline underline-offset-4 hover:decoration-2"
          >
            Exit preview
          </button>
        </form>
      </Container>
    </div>
  )
}
