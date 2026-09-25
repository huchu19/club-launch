'use client'

import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Accordion, type AccordionItemData } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/FormField'
import { InlineMessage } from '@/components/ui/InlineMessage'
import type { PublicFaq } from '@/lib/content/types'
import {
  FALLBACK_ANSWER,
  FAQ_HEADERS,
  QUESTION_MAX_LENGTH,
  type FaqRequest,
} from '@/lib/faq/protocol'
import {
  addSessionFaq,
  getServerSessionFaqs,
  getSessionFaqs,
  subscribeSessionFaqs,
} from '@/lib/faq/session-store'

export type AskFaq = (request: FaqRequest) => Promise<Response>

/** Default transport: POST /api/faq, which streams the answer as text. */
export const postFaqQuestion: AskFaq = (request) =>
  fetch('/api/faq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

export function PendingBadge() {
  return (
    <span className="inline-block rounded-sm border border-accent px-2 py-0.5 font-sans text-xs font-medium tracking-normal whitespace-nowrap text-accent">
      New — awaiting review
    </span>
  )
}

export type FaqQuestionsProps = {
  clubSlug: string
  faqs: PublicFaq[]
  ask?: AskFaq
}

type Draft = { question: string; answer: string }

export function FaqQuestions({ clubSlug, faqs, ask = postFaqQuestion }: FaqQuestionsProps) {
  const sessionItems = useSyncExternalStore(
    subscribeSessionFaqs,
    () => getSessionFaqs(clubSlug),
    getServerSessionFaqs,
  )
  const [question, setQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = draft !== null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const text = question.trim()
    if (!text) {
      setError('Enter your question')
      inputRef.current?.focus()
      return
    }
    if (text.length > QUESTION_MAX_LENGTH) {
      setError(`Your question must be ${QUESTION_MAX_LENGTH} characters or fewer`)
      inputRef.current?.focus()
      return
    }

    setError(null)
    setNotice(null)
    setDraft({ question: text, answer: '' })
    setAnnouncement('Finding an answer…')

    let response: Response
    try {
      response = await ask({ clubSlug, question: text })
    } catch {
      setDraft(null)
      setAnnouncement('')
      setNotice({ tone: 'error', text: 'We could not reach the club just now. Please try again.' })
      return
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      setDraft(null)
      setAnnouncement('')
      if (response.status === 400) {
        setError(data?.error ?? 'Check your question and try again')
        inputRef.current?.focus()
      } else {
        setNotice({
          tone: 'error',
          text: data?.error ?? 'Something went wrong. Please try again in a moment.',
        })
      }
      return
    }

    const status = response.headers.get(FAQ_HEADERS.status)
    const id = response.headers.get(FAQ_HEADERS.id) ?? `session-${Date.now()}`

    let answer = ''
    const reader = response.body?.getReader()
    if (reader) {
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setDraft({ question: text, answer })
      }
      answer += decoder.decode()
    } else {
      answer = await response.text()
    }
    answer = answer.trim()
    setDraft(null)

    if (status === 'fallback' || !answer) {
      setNotice({ tone: 'info', text: answer || FALLBACK_ANSWER })
      setAnnouncement(answer || FALLBACK_ANSWER)
      return
    }

    setQuestion('')
    const existing = document.getElementById(id)
    if (status === 'approved' && existing instanceof HTMLDetailsElement) {
      // Already answered on the page: open that answer instead of duplicating it.
      existing.open = true
      existing.querySelector('summary')?.focus()
      setAnnouncement('That question is already answered on this page. The answer is now open.')
      return
    }

    addSessionFaq(clubSlug, {
      id,
      question: text,
      answer,
      status: status === 'approved' ? 'approved' : 'pending',
    })
    setAnnouncement('Your answer has been added to the list of questions.')
  }

  const items: AccordionItemData[] = [
    ...faqs.map((faq) => ({ id: faq._id, title: faq.question, content: <p>{faq.answer}</p> })),
    ...sessionItems
      .filter((item) => !faqs.some((faq) => faq._id === item.id))
      .map((item) => ({
        id: item.id,
        title: item.question,
        badge: item.status === 'pending' ? <PendingBadge /> : undefined,
        defaultOpen: true,
        animate: true,
        content: (
          <>
            <p>{item.answer}</p>
            {item.status === 'pending' ? (
              <p className="mt-3 text-sm">
                This answer was drafted automatically from the club’s own information. The team will
                review it before it is shown to anyone else.
              </p>
            ) : null}
          </>
        ),
      })),
  ]

  return (
    <div>
      {items.length > 0 ? (
        <Accordion items={items} />
      ) : (
        <p className="border-y border-line py-6 text-ink-muted">
          No questions have been answered yet.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-12 space-y-4"
        aria-label="Ask a question"
      >
        <TextAreaField
          ref={inputRef}
          id="faq-question"
          name="question"
          label={<span className="font-display text-2xl font-medium">Anything else?</span>}
          hint="Ask about the club, its facilities or membership. Answers are drafted automatically from the club’s information. Please don’t include personal details."
          rows={2}
          maxLength={QUESTION_MAX_LENGTH}
          showCount
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" aria-disabled={busy || undefined}>
          {busy ? 'Finding an answer…' : 'Ask'}
        </Button>
      </form>

      {draft ? (
        <div
          aria-busy="true"
          className="mt-8 animate-fade rounded-md border border-line bg-surface p-6"
        >
          <p className="font-medium">{draft.question}</p>
          <p className="mt-3 text-ink-muted">
            {draft.answer || <span className="motion-safe:animate-pulse">Thinking…</span>}
          </p>
        </div>
      ) : null}

      {notice ? (
        <InlineMessage tone={notice.tone} className="mt-8" live="off">
          {notice.text}
        </InlineMessage>
      ) : null}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
