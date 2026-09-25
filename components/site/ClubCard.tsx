import Link from 'next/link'
import { ArchImage } from '@/components/media/ArchImage'
import { clubPath, type ClubPageSummary } from '@/lib/content/types'

export function ClubCard({ club }: { club: ClubPageSummary }) {
  const href = clubPath(club.market, club.slug)
  return (
    <article className="group relative flex flex-col">
      <ArchImage
        image={club.image}
        aspect="landscape"
        shape="soft"
        sizes="(min-width: 768px) 45vw, 90vw"
      />
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        {club.locality ? <span>{club.locality}</span> : null}
        <span aria-hidden="true">·</span>
        <span className={club.status === 'open' ? 'text-brand' : 'text-accent'}>
          {club.status === 'open' ? 'Open' : 'Coming soon'}
        </span>
      </div>
      <h3 className="mt-2 text-2xl">
        {/* The whole card is clickable via the stretched link; the name is its label. */}
        <Link
          href={href}
          className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4"
        >
          {club.clubName}
        </Link>
      </h3>
      {club.summary ? <p className="mt-3 text-ink-muted">{club.summary}</p> : null}
    </article>
  )
}
