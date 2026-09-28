# Architecture

Club Launch is a single Next.js application on Vercel. It serves public club pages, hosts the
Sanity Studio that editors use to build those pages, runs an admin page drafter, and exposes a
small set of API routes. Content lives in a private Sanity dataset. Two AI features use Google's
Gemini through the Vercel AI SDK, and both are designed so that a person always approves what the
public sees.

## System overview

```mermaid
flowchart LR
  visitor(["Visitor"]) --> page["Club page<br/>/uk/clubs/[slug]"]
  editor(["Editor"]) --> studio["Embedded Studio<br/>/studio"]
  admin(["Admin"]) --> drafter["Page drafter<br/>/admin/draft"]

  subgraph next["Next.js on Vercel"]
    page
    drafter
    repo[("Content repository<br/>Sanity or demo data")]
    tour["POST /api/tour"]
    faq["POST /api/faq<br/>streams text"]
    concierge["POST /api/concierge<br/>validated day plan"]
    draftApi["POST /api/admin/draft<br/>basic auth"]
    revalidate["POST /api/revalidate<br/>signature checked"]
    preview["/api/draft-mode/*"]
  end

  page -- "tagged, cached reads" --> repo
  page --> tour
  page --> faq
  page --> concierge
  drafter --> draftApi
  repo <--> sanity[("Sanity<br/>private dataset")]
  studio <--> sanity
  studio -- "Presentation tool" --> preview
  sanity -- "GROQ webhook" --> revalidate
  revalidate -- "revalidateTag" --> page
  tour --> crm["CrmAdapter<br/>(mock in v1)"]
  faq -- "club facts + question" --> gemini["Gemini<br/>(fixtures when AI_MOCK=1)"]
  concierge -- "club spaces + schedule + prompt" --> gemini
  draftApi -- "club facts + brief" --> gemini
  faq -- "pending FAQ item" --> sanity
  concierge -- "structured day plan" --> sanity
  draftApi -- "drafts.* page" --> sanity
```

| Area | Where |
|---|---|
| Routes and API handlers | `app/` (`(site)` for public pages, `api/` for handlers, `studio/` for the Studio) |
| Page blocks and UI components | `components/blocks`, `components/ui`, `components/site` |
| Content access | `lib/content` (repository interface, Sanity and demo implementations, cache tags) |
| AI features | `lib/faq`, `lib/concierge`, `lib/drafter`, `lib/ai` (model selection and mock fixtures) |
| Forms and integrations | `lib/tour`, `lib/crm`, `lib/rate-limit.ts` |
| Sanity schemas, Studio structure, publish rules | `sanity/` |
| Seed data and tooling | `scripts/` |

## Content model

| Document | Purpose | Key fields |
|---|---|---|
| `market` | A country or region | `code` (`uk`), `locale` (`en-GB`), `currency` (`GBP`) |
| `club` | The facts about one club, and the single source for everything that grounds the AI | name, slug, market, tier, status, address, geo, opening hours, phone, facilities, spaces (id, name, category, typical uses, optional own hours), sample timetable (day, time, class, space, duration, intensity), facts (label/value pairs such as the joining fee), SEO |
| `clubPage` | The page editors build for a club | club, title, ordered `blocks[]`, SEO override |
| `faqItem` | A question and answer for one club | question, answer, `source` (`editor`/`ai`), `status` (`approved`/`pending`/`rejected`), `askedCount`, `normalizedQuestion` |
| `dayPlan` | A visitor's planned first day, written by the concierge and read-only in Studio | public id, club (weak reference), day, summary, stops (time, space id, class, activity, reason), suggested membership, caveats, quick options chosen. Never the visitor's message. |

A `clubPage` is an ordered list of blocks: `heroBlock`, `facilitiesBlock`, `conciergeBlock`
(the first-day planner), `spaRecoveryBlock`, `ratesBlock`, `tourBookingBlock` and `faqBlock`. Each block type has exactly one
React component of the same name in `components/blocks`, with its own Storybook stories.
`BlockRenderer` maps `_type` to component. Editors can reorder and edit blocks but cannot produce a
layout that has not been built and tested.

Every Sanity result is parsed with zod into a view model before rendering. A malformed block is
dropped and logged, so one bad edit cannot take the page down.

The content repository has two implementations behind one interface: Sanity, and an in-memory
store built from the same demo data that `pnpm seed` writes. Demo mode (`CONTENT_MOCK=1`, or no
Sanity project configured) makes CI and end-to-end tests deterministic and lets the app run without
credentials.

## Request flows

### Page rendering and revalidation on publish

Club pages are statically rendered. Every published read is a `fetch` with `cache: 'force-cache'`
and tags for each document type it depends on, plus `club:<slug>`.

```mermaid
sequenceDiagram
  participant E as Editor (Studio)
  participant S as Sanity
  participant R as /api/revalidate
  participant N as Next.js cache
  participant V as Visitor
  E->>S: Publish change
  S->>R: Webhook {_type, slug, clubSlug} + signature
  R->>R: Verify signature, validate payload (zod)
  R->>N: revalidateTag(type), revalidateTag(club:slug), expire now
  V->>N: Next request
  N->>S: Refetch tagged data, re-render
  N-->>V: Updated page (measured at 5 to 7 s after publish)
```

Tags are deliberately coarse, keyed by document type and club, which is always correct and cheap
at this scale. The route rejects unsigned requests (401) and fails closed if the secret is not set
(503).

### Draft mode preview

The Studio's Presentation tool opens a club page with draft mode enabled.
`/api/draft-mode/enable` uses `next-sanity`'s `defineEnableDraftMode`, which checks a preview
secret that the Studio issues. While draft mode is on, the page reads with the `drafts`
perspective and shows a banner with an "Exit preview" button. Exiting is a POST to
`/api/draft-mode/disable` because it changes state.

### Tour booking

The form is validated with the same zod schema on the client and the server. The route applies a
per-IP rate limit (5 per 10 minutes) and a honeypot field; a bot that fills the honeypot gets a
realistic success response and nothing is sent on. Valid leads go to a `CrmAdapter`, chosen by
the `CRM_ADAPTER` environment variable. If the adapter throws, the route retries once and then
returns a friendly error, and the form keeps what the visitor typed. v1 ships a mock adapter that
logs one redacted line (reference, club, date, slot), never a name, email or phone number.

### FAQ ("Anything else?")

```mermaid
flowchart TD
  q["Visitor question"] --> v["Validate (zod), rate limit 10 / 10 min"]
  v --> red["Redact emails and phone numbers"]
  red --> norm["Normalise: lowercase, strip punctuation, collapse spaces"]
  norm --> cache{"Approved or pending answer<br/>for this normalised question?"}
  cache -- yes --> hit["Return it, increment askedCount<br/>no model call"]
  cache -- no --> ground["Grounding context:<br/>this club's document + approved FAQs only"]
  ground --> model["Stream from Gemini"]
  model -- "error before first token" --> fb["Friendly fallback, nothing saved"]
  model -- streaming --> done{"Stream completed<br/>and answer valid?"}
  done -- yes --> save["Save faqItem: source ai, status pending"]
  done -- no --> nosave["Append fallback line, nothing saved"]
```

The response is a plain-text stream. Headers carry the status (`X-Faq-Status`), where the answer
came from (`X-Faq-Source`: cache, model or fallback) and the item id, because the client needs
them before it reads the body. The new pending answer is kept in the asker's `sessionStorage` so
only they see it, labelled "New, awaiting review". An editor approves it in Studio; publishing
the change triggers revalidation, and it then appears for everyone.

### First-day concierge

```mermaid
flowchart TD
  m["Message + chosen quick options"] --> v["Validate (zod), rate limit 5 / 10 min"]
  v --> c{"Club page has the planner<br/>and the club has spaces?"}
  c -- no --> nf["404"]
  c -- yes --> f["Keep only the block's own options;<br/>redact contact details"]
  f --> g["Grounding: this club's spaces, timetable,<br/>opening hours and membership plans"]
  g --> model["Gemini, structured output (zod)"]
  model -- "API or quota error" --> un["503, friendly message"]
  model -- "offTopic" --> ref["Polite refusal, nothing stored"]
  model --> chk{"Every stop fits the club's data?"}
  chk -- "no, first try" --> retry["Retry once with the problems listed"]
  retry --> model
  chk -- "no, second try" --> fail["502, friendly message"]
  chk -- yes --> cav["Add a professional caveat if health was mentioned"]
  cav --> save["Store the structured plan under a random public id"]
  save --> out["Return the plan with space names and prices resolved"]
```

The model returns a fixed-shape object: the day, 4 to 6 stops (time, space id, class name or
empty, activity, reason), a suggested membership and any caveats. zod checks the shape; a
separate validator (`lib/concierge/validate.ts`) checks meaning. Each space must exist. Each time
must fall within the club's hours that day, or the space's own hours where it has them. Each
named class must be on the timetable that day, at that time, in that space. Stops must be in
order, and the membership must be a real plan. Problems are written so they can be fed back to
the model verbatim for its one retry.

The visitor's message is redacted, fenced and never stored. The stored `dayPlan` holds only the
structured plan and which of the block's quick options were chosen; options the block doesn't
offer are dropped before the model or the store sees them. If the visitor mentions an injury or
a health condition, the server makes sure the plan carries a caveat recommending a GP or
physiotherapist, even if the model forgot.

"Book a tour for this day" keeps the plan's public id in `sessionStorage` and moves focus to the
tour form, which shows that the plan is attached and lets the visitor remove it. The tour route
loads the plan by id, checks it belongs to the same club, and passes `{ lead, dayPlan }` to the
CRM adapter. The model runs before any contact details exist, so it never sees them.

### Page drafter

`/admin/draft` and `/api/admin/draft` sit behind HTTP basic auth, enforced in `proxy.ts` and
checked again in the route. The route loads the chosen club's facts (no phone number or street
address) and asks the model for one strict object per block type. Output is validated with zod;
on failure the route tries once more, then returns a clear error. A number guard then wraps any
figure that does not appear in the club's facts as `[[CHECK: n]]`. The result is saved as a
Sanity draft (`drafts.` id) and the response lists the placeholders with a link to open the draft
in Studio. Nothing is published.

In Studio, a banner on the club page form lists the remaining placeholders, and a document-level
validation rule fails while any `[[` remains. Sanity does not allow publishing a document with
validation errors, so a draft cannot go live until every placeholder is replaced.

## AI safety design

| Risk | Control |
|---|---|
| AI content reaching the public unreviewed | AI writes only Sanity drafts and `pending` FAQ items. Only `approved` FAQs render. Placeholders block publishing. |
| Invented facts | Grounding on one club's data only. Unknown prices, dates and numbers become placeholders, and the number guard catches the rest. FAQ questions outside the context get a polite refusal. |
| Health questions | The FAQ politely declines and suggests a tour or contacting the club. The concierge may suggest gentle classes and recovery, never diagnoses or promises results, and the server guarantees a caveat recommending a GP or physiotherapist. Plans never repeat the health detail itself. |
| Prompt injection | Visitor text is fenced in tags with `<` and `>` stripped, and the instructions treat it strictly as a question. Output is structured and validated, so injected instructions cannot change what gets saved. |
| Personal data | Tour submissions never go to the model. Emails and phone numbers are redacted from questions before the model or CMS sees them. The concierge stores only the structured plan. |
| Malformed output | zod on every response, one retry, then a clear error. Day plans are also checked against the club's real spaces, hours and timetable, with the problems fed back for the retry. |
| Quota exhaustion and outages | The FAQ waits for the first token before committing to a stream, so failures become a clean fallback. SDK retries are off, since quota errors don't clear in seconds. The concierge retries once after 1.5 s when the provider reports a temporary overload (5xx), but never on quota errors. |
| Cost | Free tiers only. Rate limits on every AI route; repeated questions are served from the CMS without a model call. |

## Testing and CI

| Layer | Tooling | Covers |
|---|---|---|
| Unit | Vitest | Schemas, normalisation, grounding, prompt fencing, redaction, rate limiting, CRM retry, drafter retry, number guard, publish rule, day-plan validator, retry and health caveats, the model request payload (no personal data), JSON-LD, webhook signatures, route handlers, GROQ queries run with `groq-js` over the seed documents |
| Component | Storybook with the Vitest addon, in a real browser | Every component in light, dark and mobile, edge cases and interaction tests. Any axe accessibility violation fails the build. |
| End to end | Playwright with `@axe-core/playwright` against a production build | Keyboard-only tour booking, keyboard-only day planning and booking a tour for that day, FAQ streaming and caching, refusals and fallback, the drafter, admin auth, WCAG 2.2 AA scans |

With `AI_MOCK=1`, the model is replaced by deterministic fixtures that still run through the real
AI SDK code paths (`MockLanguageModelV4`), so tests exercise the same streaming and
structured-output handling as production. CI runs three jobs on every push and pull request (lint,
typecheck, unit tests and build; Storybook tests and build; end-to-end), all with `AI_MOCK=1` and
demo content, so CI needs no secrets.

## Key decisions and trade-offs

- **One block, one schema type, one component, one story.** This limits what editors can do,
  deliberately: every layout they can produce has been tested, including for accessibility.
- **Static rendering with on-demand revalidation.** Pages are fast and cheap to serve, and
  published edits appear in seconds without a redeploy. The cost is webhook plumbing and a
  signature check.
- **A content repository interface.** It adds a layer, but lets the whole app, CI and the e2e
  suite run against demo data with no credentials.
- **Plain-text streaming with metadata in headers** for the FAQ, instead of a chat protocol,
  because the client needs to know the answer's status before reading it.
- **Two layers of validation for day plans.** A schema can only say a time looks like `07:15`;
  it can't say the reformer class is on at 07:15 on Tuesdays. The domain validator is what makes
  a generated timetable trustworthy, and feeding its messages back gives the retry a real chance.
- **Spaces alongside facilities.** Spaces carry the ids, hours and typical uses the planner and
  map need. Facilities stay as the simpler marketing list for now; consolidating the two is part
  of the single-source-of-facts work on the roadmap.
- **One strict object per block for the drafter**, rather than a free-form array of a union type.
  Gemini's structured output is much more reliable with fixed shapes, and every draft gets all six
  blocks.
- **In-memory, per-instance rate limiting.** Free and simple, but on serverless each warm instance
  keeps its own window, so the effective limit is higher. A shared store (Redis or Vercel KV) is
  the upgrade path.
- **Images served by Sanity's CDN** through a custom `next/image` loader, so Vercel's image
  optimisation quota is never used.
- **Free tiers only**: Gemini's free tier, Sanity's free plan and Vercel Hobby. New FAQ answers
  take 5 to 9 seconds to start on the free tier; repeats are served from the CMS in about 2.
