import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { TextLink } from '@/components/ui/TextLink'
import { getContentRepository } from '@/lib/content'
import { buildInsights, type InsightQuestion } from '@/lib/insights/insights'
import type { QuestionGroup } from '@/lib/insights/group'
import { cn } from '@/lib/cn'
import { studioEditPath } from '@/lib/studio'

// Behind basic auth (proxy.ts) and always fresh: this is live visitor data.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Question insights',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ club?: string }> }

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/London',
})

export default async function InsightsPage({ searchParams }: Props) {
  const { club: requested } = await searchParams
  const repository = getContentRepository()
  const clubs = await repository.listClubPages()
  // Default to an open club: it's the one with real visitors.
  const current =
    clubs.find((c) => c.slug === requested) ?? clubs.find((c) => c.status === 'open') ?? clubs[0]
  const club = current ? await repository.getClubBySlug(current.slug) : null

  if (!current || !club) {
    return (
      <Container className="py-section">
        <Heading level={1} size="xl">
          Question insights
        </Heading>
        <p className="mt-6 text-lg text-ink-muted">No club pages are published yet.</p>
      </Container>
    )
  }

  const [questions, plans] = await Promise.all([
    repository.listQuestions(club._id),
    repository.listDayPlans(club._id),
  ])
  const insights = buildInsights(questions, plans, club)
  const maxChip = Math.max(1, ...insights.planner.chips.map((c) => c.count))

  return (
    <Container className="space-y-16 py-section">
      <header className="max-w-3xl">
        <Eyebrow>Admin</Eyebrow>
        <Heading level={1} size="xl">
          What visitors ask about {club.name}
        </Heading>
        <p className="mt-6 text-lg text-ink-muted">
          Questions from the FAQ box, grouped when they mean the same thing, and what people
          planning a first day care about. Write approved answers for the questions that come up
          most.
        </p>
        {clubs.length > 1 ? (
          <nav aria-label="Clubs" className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {clubs.map((c) => (
              <TextLink
                key={c.slug}
                href={`/admin/insights?club=${c.slug}`}
                aria-current={c.slug === current.slug ? 'page' : undefined}
                className={c.slug === current.slug ? 'font-semibold no-underline' : undefined}
              >
                {c.clubName}
              </TextLink>
            ))}
          </nav>
        ) : null}
        <p className="mt-6 text-sm text-ink-muted">
          Also in admin: <TextLink href="/admin/draft">draft a club page</TextLink>.
        </p>
      </header>

      <section aria-labelledby="totals-heading">
        <h2 id="totals-heading" className="sr-only">
          At a glance
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Times questions were asked', insights.totals.timesAsked],
            ['New questions this week', insights.totals.newThisWeek],
            ['Waiting for review', insights.totals.waitingForReview],
            ['Days planned this week', insights.totals.plansThisWeek],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-line bg-surface p-5">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="mt-1 text-4xl font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <QuestionTable
        id="most-asked"
        title="Most asked"
        description="Similar questions are grouped under the one asked most."
        groups={insights.mostAsked}
        empty="Nobody has asked a question yet."
      />

      <QuestionTable
        id="needs-answer"
        title="Waiting for an answer"
        description="Answers drafted by the assistant, not yet approved. Where it couldn’t answer, the page needs the fact first."
        groups={insights.needsAnswer}
        empty="Every question has an approved answer."
      />

      <section aria-labelledby="new-heading">
        <h2 id="new-heading" className="text-2xl">
          New this week
        </h2>
        {insights.newThisWeek.length ? (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {insights.newThisWeek.map((q) => (
              <li key={q._id} className="flex flex-wrap items-baseline justify-between gap-4 py-4">
                <span>{q.question}</span>
                <span className="flex items-baseline gap-4 text-sm text-ink-muted">
                  <StatusBadge question={q} />
                  <time dateTime={q.createdAt}>{dateFormat.format(new Date(q.createdAt))}</time>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-ink-muted">No new questions in the last seven days.</p>
        )}
      </section>

      <section aria-labelledby="planner-heading">
        <h2 id="planner-heading" className="text-2xl">
          What first-day planners care about
        </h2>
        <p className="mt-2 text-ink-muted">
          From {insights.planner.plans} planned {insights.planner.plans === 1 ? 'day' : 'days'}.
          Only the options people tapped are counted; their own words are never stored.
        </p>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium">Options chosen</h3>
            {insights.planner.chips.length ? (
              <ul className="mt-4 space-y-3">
                {insights.planner.chips.map((chip) => (
                  <li key={chip.label}>
                    <div className="flex justify-between gap-4">
                      <span>{chip.label}</span>
                      <span className="font-semibold tabular-nums">{chip.count}</span>
                    </div>
                    <div aria-hidden="true" className="mt-1 h-2 rounded-r-[4px] bg-raised">
                      <div
                        className="h-full rounded-r-[4px] bg-brand"
                        style={{ width: `${(chip.count / maxChip) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-ink-muted">No options chosen yet.</p>
            )}
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium">Caveats added</h3>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt>Health (see a GP or physiotherapist)</dt>
                  <dd className="font-semibold tabular-nums">{insights.planner.healthCaveats}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Other notes</dt>
                  <dd className="font-semibold tabular-nums">{insights.planner.otherCaveats}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-medium">Spaces planned around most</h3>
              {insights.planner.spaces.length ? (
                <ol className="mt-4 space-y-2">
                  {insights.planner.spaces.map((space) => (
                    <li key={space.spaceId} className="flex justify-between gap-4">
                      <span>{space.name}</span>
                      <span className="font-semibold tabular-nums">{space.count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-ink-muted">No days planned yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </Container>
  )
}

function StatusBadge({ question }: { question: InsightQuestion }) {
  const [label, tone] = question.refused
    ? ['Couldn’t answer', 'border-accent text-accent']
    : question.status === 'approved'
      ? ['Approved', 'border-brand text-brand']
      : ['Waiting for review', 'border-line-strong text-ink-muted']
  return (
    <span
      className={cn('rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap', tone)}
    >
      {label}
    </span>
  )
}

function QuestionTable({
  id,
  title,
  description,
  groups,
  empty,
}: {
  id: string
  title: string
  description: string
  groups: QuestionGroup<InsightQuestion>[]
  empty: string
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-2xl">
        {title}
      </h2>
      <p className="mt-2 text-ink-muted">{description}</p>
      {groups.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead className="border-b border-line-strong text-sm text-ink-muted">
              <tr>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Question
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  Times asked
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-3 font-medium">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((group) => (
                <tr key={group.lead._id} className="align-top">
                  <td className="py-4 pr-4">
                    {group.lead.question}
                    {group.members.length > 1 ? (
                      <details className="mt-1 text-sm text-ink-muted">
                        <summary className="cursor-pointer">
                          {group.members.length - 1} similar{' '}
                          {group.members.length === 2 ? 'question' : 'questions'}
                        </summary>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {group.members.slice(1).map((member) => (
                            <li key={member._id}>
                              {member.question} ({member.askedCount})
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4 text-right tabular-nums">{group.totalAsked}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge question={group.lead} />
                  </td>
                  <td className="py-4 text-right">
                    <TextLink href={studioEditPath(group.lead._id, 'faqItem')}>
                      {group.lead.status === 'approved'
                        ? 'Edit the answer'
                        : 'Write an approved answer'}
                      <span className="sr-only">: {group.lead.question}</span>
                    </TextLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-ink-muted">{empty}</p>
      )}
    </section>
  )
}
