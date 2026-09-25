'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField } from '@/components/ui/FormField'
import { InlineMessage } from '@/components/ui/InlineMessage'
import type { ClubOption } from '@/lib/content/types'
import {
  BRIEF_MAX_LENGTH,
  draftRequestSchema,
  tones,
  type DraftRequest,
} from '@/lib/drafter/schema'
import type { DraftResult } from '@/lib/drafter/service'

export type SubmitDraft = (
  request: DraftRequest,
) => Promise<{ ok: true; result: DraftResult } | { ok: false; error: string }>

export const postDraftRequest: SubmitDraft = async (request) => {
  try {
    const res = await fetch('/api/admin/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const data = (await res.json().catch(() => null)) as (DraftResult & { error?: string }) | null
    if (res.ok && data?.draftId) return { ok: true, result: data }
    return { ok: false, error: data?.error ?? 'The draft could not be created. Please try again.' }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' }
  }
}

const toneLabels: Record<(typeof tones)[number], string> = {
  calm: 'Calm',
  energetic: 'Energetic',
  premium: 'Premium',
}

type Errors = Partial<Record<'clubId' | 'brief' | 'tone', string>>

export function DraftForm({
  clubs,
  submit = postDraftRequest,
}: {
  clubs: ClubOption[]
  submit?: SubmitDraft
}) {
  const [clubId, setClubId] = useState(clubs.length === 1 ? (clubs[0]?._id ?? '') : '')
  const [brief, setBrief] = useState('')
  const [tone, setTone] = useState<string>('calm')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [result, setResult] = useState<DraftResult | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const failureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])
  useEffect(() => {
    if (failure) failureRef.current?.focus()
  }, [failure])

  if (clubs.length === 0 && !result) {
    return (
      <InlineMessage tone="info" live="off" title="Every club already has a page">
        Add a new club in the studio first, then come back to draft its page.
      </InlineMessage>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const parsed = draftRequestSchema.safeParse({ clubId, brief, tone })
    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof Errors
        next[field] ??= issue.message
      }
      setErrors(next)
      const first = (['clubId', 'brief', 'tone'] as const).find((f) => next[f])
      if (first) document.getElementById(`draft-${first}`)?.focus()
      return
    }
    setErrors({})
    setFailure(null)
    setBusy(true)
    const response = await submit(parsed.data)
    setBusy(false)
    if (response.ok) setResult(response.result)
    else setFailure(response.error)
  }

  if (result) {
    const unique = [...new Map(result.placeholders.map((p) => [p.raw, p])).values()]
    return (
      <div ref={resultRef} tabIndex={-1} className="space-y-8 focus:outline-none">
        <InlineMessage
          tone="success"
          title={`Draft created for ${result.clubName}. Nothing has been published.`}
        >
          {unique.length > 0
            ? `Replace the ${unique.length} placeholder${unique.length === 1 ? '' : 's'} below in the studio. Publishing stays blocked until none are left.`
            : 'Review the draft in the studio before publishing.'}
        </InlineMessage>

        {unique.length > 0 ? (
          <div>
            <h2 className="font-sans text-lg font-medium tracking-normal">
              Placeholders to replace
            </h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {unique.map((p) => (
                <li
                  key={p.raw}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
                >
                  <code className="font-mono text-sm text-accent">{p.raw}</code>
                  <span className="text-sm text-ink-muted">{p.location}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result.flaggedNumbers.length > 0 ? (
          <InlineMessage tone="info" live="off" title="Numbers to check">
            The AI used numbers that are not in the club’s facts, so they were marked as{' '}
            <code>[[CHECK: …]]</code>: {result.flaggedNumbers.join(', ')}.
          </InlineMessage>
        ) : null}

        <div className="flex flex-wrap gap-4">
          <a
            href={result.studioPath}
            className="inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-medium text-on-brand shadow-[0_3px_0_var(--color-brand-strong)] hover:bg-brand-strong"
          >
            Open the draft in the studio
          </a>
          <Button variant="secondary" onClick={() => setResult(null)}>
            Draft another page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {failure ? (
        <div ref={failureRef} tabIndex={-1} className="focus:outline-offset-4">
          <InlineMessage tone="error" title="The draft was not created">
            {failure}
          </InlineMessage>
        </div>
      ) : null}
      <SelectField
        id="draft-clubId"
        name="clubId"
        label="Club"
        hint="Only clubs without a page are listed."
        placeholder="Choose a club"
        options={clubs.map((c) => ({ value: c._id, label: c.name }))}
        value={clubId}
        onChange={(e) => setClubId(e.target.value)}
        error={errors.clubId}
      />
      <TextAreaField
        id="draft-brief"
        name="brief"
        label="Brief"
        hint="What should the page emphasise? The AI uses only the club’s facts and marks anything else as a [[placeholder]]."
        rows={6}
        maxLength={BRIEF_MAX_LENGTH}
        showCount
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        error={errors.brief}
      />
      <SelectField
        id="draft-tone"
        name="tone"
        label="Tone"
        options={tones.map((t) => ({ value: t, label: toneLabels[t] }))}
        value={tone}
        onChange={(e) => setTone(e.target.value)}
        error={errors.tone}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" aria-disabled={busy || undefined}>
          {busy ? 'Drafting…' : 'Draft the page'}
        </Button>
        <p role="status" className="text-sm text-ink-muted">
          {busy ? 'Drafting the page. This can take up to 30 seconds.' : ''}
        </p>
      </div>
    </form>
  )
}
