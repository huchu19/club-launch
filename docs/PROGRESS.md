# PROGRESS

## Milestones
- [x] M0 Setup (local; CI and Vercel pending checkpoint A)
- [x] M1 Design system + Storybook (local; Storybook deploy pending checkpoint B)
- [x] M2 CMS + Mayfair-style page (demo content verified; live Sanity pending checkpoints A/C)
- [x] M3 Tour booking
- [x] M4 Infinite FAQ (mock-verified; live Gemini and Studio approval pending checkpoints)
- [x] M5 AI page drafter (mock-verified; Studio publish flow pending checkpoints)
- [x] M6 Test hardening (local + CI-simulated; real CI run pending the GitHub repo)
- [ ] M7 Package (README and demo script done; deploy and smoke test need checkpoints A/B)

## M0 — Setup
Plan: Next.js App Router + TS strict + Tailwind 4 + ESLint + Prettier on pnpm; embedded Studio at
`/studio`; `next-sanity` server client; `.env.example`; basic-auth `proxy.ts` for `/admin` and
`/api/admin`; GitHub Actions CI (lint, typecheck, test, build with `AI_MOCK=1` and dummy env).

Acceptance
- [x] `pnpm dev` serves `/` and `/studio` locally — verified with curl (200/200) and a
  screenshot: the Studio bundle boots and talks to Sanity (a dummy project id shows Sanity's
  "Project not found", so a real id will show the login screen). `/admin/draft` returns 503
  when `ADMIN_PASSWORD` is unset (fails closed), 401 without credentials.
- [ ] CI passes on push — workflow written; blocked until the GitHub repo exists (see Known issues).

## M1 — Design system + Storybook
Plan: tokens as CSS variables in Tailwind 4 `@theme` (light) with dark overrides via
`prefers-color-scheme` and `data-theme`; base components; the six blocks as presentational
components with typed props; Storybook 10 (`@storybook/nextjs-vite`) with a11y, a theme toolbar
and mobile viewport; Storybook tests via the Vitest addon in CI.

Acceptance
- [x] Every component has stories; `pnpm build-storybook` succeeds — 15 story files (9 UI, 6
  blocks), each with default, dark, mobile and edge cases (long text, missing image, empty
  lists, draft placeholders, validation errors, server failure, streaming FAQ answer, fallback).
- [x] Zero serious/critical a11y violations — `parameters.a11y.test = 'error'` globally; all 80
  story tests pass. Verified the gate works: a probe story with an unlabelled button and
  low-contrast text failed (`button-name`, `color-contrast`), then was deleted.
- [x] CI runs Storybook tests — `storybook` job in `ci.yml` (`test-storybook`, `build-storybook`).

## M2 — CMS + Mayfair-style page
Plan: schemas with validation (required alt text, placeholder rule); `BlockRenderer`;
`/[market]/clubs/[slug]` with metadata, canonical, JSON-LD, static params; `/` club index;
sitemap and robots; signed webhook → `revalidateTag`; draft mode via the Presentation tool;
idempotent `pnpm seed`.

Acceptance
- [x] Mayfair-style page renders fully — verified in demo-content mode (`pnpm build && pnpm
  start`): all six blocks, 200 for the page, 404 for an unknown club, one `<h1>`,
  `lang="en-GB"`, light/dark and 390 px mobile screenshots checked. The same data is what
  `pnpm seed` writes to Sanity; rendering it from Sanity needs credentials (checkpoint A).
- [x] Sanity read path verified offline — `lib/sanity/queries.test.ts` runs every GROQ query
  with `groq-js` (Sanity's engine) over exactly the documents `pnpm seed` writes and parses the
  results with the page view models; `sanity schema validate`: 0 errors, 0 warnings.
- [ ] Studio edit → live within ~10 s without redeploy — implemented (tagged `force-cache`
  reads, signed webhook calling `revalidateTag(tag, { expire: 0 })`, unit-tested with real
  Sanity signatures incl. bad signature/payload/missing secret). Needs the webhook (checkpoint C)
  to verify end to end.
- [x] JSON-LD validates, sitemap lists the page — `HealthClub` typed with `schema-dts`
  (compile-time schema.org check) plus unit tests for address, geo and grouped
  `openingHoursSpecification`; `<` is escaped. `/sitemap.xml` lists `/` and the Mayfair page;
  `/robots.txt` disallows `/studio`, `/admin`, `/api`.

## M3 — Tour booking
Plan: shared zod schema (client + server), honeypot, 5 / 10 min per-IP limiter, `CrmAdapter`
with `MockCrmAdapter` chosen by `CRM_ADAPTER`, retry once then a friendly error; accessible
field errors, error summary, success state, input kept on failure.

Acceptance
- [x] Valid submission shows success; invalid shows field errors; keyboard-only works —
  Playwright `e2e/tour.spec.ts` drives the real production build with the keyboard only
  (Tab to the hero CTA → Enter → submit empty → error summary gets focus → summary link focuses
  the field → fill → Space on consent → Enter), plus axe WCAG 2.2 AA scans of the page, the
  error state and the success state. Storybook tests cover the same states in isolation.
- [x] Unit tests cover validation, retry and rate limiting — `lib/tour/schema.test.ts`,
  `lib/crm/adapter.test.ts` (success, one retry, give up after retry, redacted log),
  `lib/rate-limit.test.ts` (limit, sliding window, per key, eviction) and
  `app/api/tour/route.test.ts` (400 field errors, 413, honeypot, 404 club, 502 after retry,
  429 with Retry-After on the sixth request).

## M4 — Infinite FAQ
Plan: `faqBlock` accordion + "Anything else?" streaming UI; `/api/faq` per SPEC §5 (validate,
10 / 10 min limit, normalised-question cache, club-only grounding, refusals, pending save,
quota fallback); `AI_MOCK=1` fixtures for an in-context answer, a refusal and a quota error.

Acceptance
- [x] New question streams an answer and adds a pending item visible only to the asker —
  e2e: asked by keyboard, answer streams, item joins the list open with "New — awaiting
  review", survives a reload in that session, and a second browser context doesn't see it.
- [x] Repeating the same question does not call Gemini — unit test asserts the model's
  `doStreamCalls` stays at 1 for a re-worded repeat; e2e asserts `X-Faq-Source: cache` for the
  second visitor. Approved questions are served from the CMS and bump `askedCount`.
- [ ] Approving in Studio makes it visible to everyone — implemented (page query only
  includes `status == "approved"`; the `faqItem` webhook expires the page's cache tag). Needs
  the live Sanity project + webhook (checkpoints A, C) to verify end to end.
- [x] Off-topic / medical / unknown-price questions get the polite refusal — mock fixtures
  unit-tested (medical, off-topic, unlisted price refused; listed price answered) and e2e.
  The real model gets the same rules in `FAQ_INSTRUCTIONS` (not yet tried against Gemini: no
  API key available to me).
- [x] Unit tests for normalisation, grounding context builder, refusal path (mocked) — plus
  prompt-injection fencing, contact-detail redaction, quota fallback, mid-stream failure
  (fallback appended, nothing saved), unknown club, and route headers/validation/429.

## M5 — AI page drafter
Plan: `/admin/draft` (basic auth) → `/api/admin/draft`: load the club's facts, structured
output validated with zod, retry once, create a `drafts.` club page, respond with the
placeholders and a Studio link. Studio banner + publish-blocking validation for `[[`.

Acceptance
- [x] A brief for the Moorgate-style club creates a draft page with flagged placeholders —
  e2e (demo content + `AI_MOCK=1`): the admin picks Linden Moorgate, submits a brief, sees
  "Nothing has been published", four placeholders with editor-friendly locations and a Studio
  deep link. Unit tests check the saved document: `drafts.` id, all six blocks in order,
  placeholders present, valid against the page view model. Creating it in the real Studio
  needs Sanity credentials (checkpoint A).
- [ ] Draft can't be published until placeholders are replaced; then publishing makes it live
  — the document-level rule returns an error (Sanity blocks publishing on validation errors)
  while any `[[` remains, including a half-deleted `[[DATE`; the banner lists what's left.
  Unit-tested (`sanity/validation.test.ts`: blocked with placeholders, allowed once replaced).
  The click-through in Studio needs the live project.
- [x] Unit test: invalid model output → one retry → clear error — `lib/drafter/service.test.ts`
  (two invalid replies → `DraftGenerationError` after exactly 2 model calls; invalid then valid
  → success on attempt 2), plus route tests for 401/400/404/409.

## M6 — Test hardening
Plan: Playwright with `AI_MOCK=1` for (1) keyboard-only tour booking and (2) asking an FAQ
question, with axe on the club page in both; `pnpm e2e` in CI (build + start, then run).

Acceptance
- [x] Both e2e flows pass locally — 8 Playwright tests: tour (keyboard-only, axe on initial,
  error and success states), accordion keyboard, FAQ (new question, session-only visibility,
  cache hit, existing answer, refusal, quota fallback, axe), drafter, admin auth.
- [ ] Full CI pipeline green — every CI step run locally with `CI=1` and the workflow's dummy
  environment: `format:check`, `lint`, `typecheck`, `test` (100), `build`, `test-storybook`
  (91), `build-storybook`, `e2e` (8) all pass. The workflow YAML parses (3 jobs). The real run
  needs the GitHub repo (checkpoint A).

## Decisions
- **Versions (checked 25 Sep 2026).** Next 16.3.6, React 19.3, Sanity 6.16, next-sanity 13.3,
  AI SDK 7 (`ai` 7.0, `@ai-sdk/google` 4), zod 4.6, Tailwind 4.3, Storybook 10.6, pnpm 12.6,
  Node 24 LTS. Pinned below latest where peers require it: TypeScript 6.0.3 (typescript-eslint
  supports < 6.1; TS 7 is the Go port), ESLint 9.39 (eslint-plugin-react/import/jsx-a11y do not
  support ESLint 10 yet), Vitest 4.1 (`@storybook/addon-vitest` supports Vitest 3–4).
- **Next 16 conventions.** Basic auth lives in `proxy.ts` (middleware was renamed). Webhook
  revalidation uses `revalidateTag(tag, { expire: 0 })` (the one-argument form is deprecated).
  No Cache Components: published Sanity reads use `fetch` with `cache: 'force-cache'` and tags.
- **Demo-content mode (`CONTENT_MOCK=1`).** A content repository interface has two
  implementations: Sanity, and an in-memory one built from the same demo data `pnpm seed` writes.
  Demo mode is used when `CONTENT_MOCK=1` or no Sanity project id is set. This keeps CI and e2e
  deterministic and secret-free, and lets the app run before Sanity is configured. Added
  `CONTENT_MOCK` to `.env.example`.
- **Global CSS is scoped to the site.** The root layout only sets fonts and `<html lang>`;
  `app/(site)/layout.tsx` imports `globals.css`, so Tailwind's preflight never touches the
  embedded Studio.
- **Visual identity.** `../portfolio` exists, so per DESIGN.md its tokens were reused: parchment
  `#f8f1e5` canvas, cream plaster `#eee4d2` alternate bands, walnut ink `#302923`, muted
  `#6f6257`, Bricolage Grotesque (display) + Inter (body), 8px unit, the portfolio's
  `cubic-bezier(0.22, 1, 0.36, 1)` easing and short offset "printed" shadows. The portfolio no
  longer uses deep green, but DESIGN.md's product direction does, so the brand stays `#1e5b43`
  and dark mode stays near-black green-tinted (the portfolio's night palette is warm brown,
  tuned for its illustrated room). Terracotta (`#9a4538`, darkened from the portfolio's
  `#a94d3f` for AA on cream) is used only for tiny labels.
- **Contrast (WCAG AA) of token pairs**, light / dark: ink on canvas 12.8 / 16.5; muted on
  canvas 5.3 / 8.3; muted on raised 4.7 / 7.1; brand on canvas 7.1 / 7.4; on-brand on brand
  8.0 / 7.4; input border (line-strong) on surface 4.0 / 3.9 (≥ 3:1 non-text).
- **Accordion uses native `<details>/<summary>`**: keyboard operable and announced as
  expandable with no JavaScript, so the approved FAQ list works before hydration.
- **Transports are injectable.** `TourForm` takes `submit`, `FaqQuestions` takes `ask`
  (defaults: `POST /api/tour`, `POST /api/faq`), so stories and interaction tests run without
  a server. Server components never pass functions, so defaults apply in the app.
- **Pending FAQ answers live in `sessionStorage`**, read through `useSyncExternalStore` (no
  hydration mismatch). Visible only to the asker, only in that tab session.
- **Placeholder imagery** is flat cut-paper SVG art in the portfolio palette
  (`design/placeholders`), rendered to JPEG by `scripts/render-placeholders.ts`, so it works
  with Sanity's image CDN after seeding. Fictional operator "Linden" (Mayfair, Moorgate);
  phone numbers from Ofcom's drama range.
- **`next/image` loader**: a global custom loader uses Sanity CDN transforms for Sanity images,
  so the Vercel image-optimisation quota is never used (free tier).
- **Content repository.** `getContentRepository()` returns the Sanity or demo implementation;
  pages, API routes and the drafter only talk to the interface. Every Sanity result is parsed
  with zod into view models (nulls → undefined); a malformed block is dropped and logged rather
  than breaking the page.
- **FAQ answers are plain text** (SPEC allows portable text or plain text).
- **Rate plan prices are strings** holding a plain number ("245") so a draft can hold a
  `[[PRICE: …]]` placeholder; the schema rejects anything else, and the component formats
  numbers with the market's locale and currency.
- **Cache tags**: reads are tagged with every document type they depend on plus `club:<slug>`;
  the webhook expires the changed document's type and slug. Coarse but correct at this scale.
- **Club pages get absolute titles** (no "· Club Launch" suffix): the club is the brand there.
- **Draft mode exit is a POST form** (it changes state), handled by `/api/draft-mode/disable`.
- **Rate limiting is in memory, per instance** (documented in `lib/rate-limit.ts`): on
  serverless each warm instance has its own window, so the effective limit is higher. Bounded
  to 10,000 keys with least-recently-used eviction.
- **Honeypot hits get a fake success** (a real-looking reference) and are never sent to the
  CRM, so bots learn nothing.
- **The mock CRM logs one redacted line** (reference, club, date, slot, whether a phone was
  given): never name, email or phone.
- **Tour dates** are limited to today (London time) up to 90 days ahead.
- **e2e sets the date field with `fill()`** after reaching it by Tab: headless Chromium's date
  segment order doesn't follow the page locale, so typed digits are platform-dependent.
- **FAQ streaming protocol**: `text/plain` stream plus headers `X-Faq-Status`
  (`approved` | `pending` | `fallback`), `X-Faq-Source` (`cache` | `model` | `fallback`) and
  `X-Faq-Id`, read with a small `fetch` reader. Chosen over `useCompletion` because the client
  needs response metadata before the body. The pending item's id is generated up front so it
  can be sent in the headers; it is only saved once the full answer has streamed and
  validated, before the response closes (so serverless doesn't cut the save off).
- **The server waits for the model's first token** before choosing the response, so quota and
  API errors become a clean fallback (nothing saved). `maxRetries: 0` for the FAQ: quota
  errors don't clear in seconds.
- **AI mocks run through the real SDK** (`MockLanguageModelV4` from `ai/test`), so
  `AI_MOCK=1` exercises the same `streamText` / structured-output code as production. Ask a
  question containing "quota" to trigger the quota fixture.
- **Refusals are saved as pending**, as SPEC §5 says: editors see what visitors want to know
  and can reject or answer them.
- **Contact details are redacted from questions** (emails, phone numbers) before the model
  or the CMS sees them, and the UI asks visitors not to include personal details.
- **`generateObject` is deprecated in AI SDK 6+**; the drafter uses `generateText` with
  `output: Output.object(...)`. `system` is now `instructions` in AI SDK 7.
- **Drafter output shape.** The model returns one strict object per block type (`hero`,
  `facilities`, `spaRecovery`, `rates`, `tourBooking`, `faq`) instead of a free array of a
  discriminated union; the server builds the ordered `blocks[]` with `_key`s. Gemini's
  structured output handles fixed-shape objects much more reliably than `anyOf` arrays, and
  every page still gets all six blocks. Rate plan prices must be a plain number or a
  `[[PRICE: …]]` placeholder (schema regex).
- **Drafter limits are generous; target lengths are field descriptions.** Hard `max` limits
  only reject absurd output (so a slightly long line doesn't fail the draft twice); the model
  sees "under 60 characters" etc. via `.describe()`, which the Google provider passes on in
  `responseJsonSchema`. Price placeholders tolerate spacing and case (`[[ price : … ]]`).
- **No small `maxOutputTokens` for the FAQ**: thinking tokens on Gemini thinking models count
  towards it and can produce empty answers. The provider defaults Gemini 3 models to
  `thinkingLevel: 'low'`.
- **Number guard.** After validation, any number in the draft that doesn't appear in the
  club's facts becomes `[[CHECK: n]]`, so an invented figure can't slip through to publishing.
- **Drafter sends facts only**: name, status, tier, locality, hours, facilities, facts. No
  phone or street address. `maxRetries: 0` in the SDK; our loop is the single retry.
- **Admin API checks basic auth itself too** (`requireAdmin`), in case the proxy matcher ever
  changes. Drafts are rate limited (10 / 10 min) to protect the free Gemini quota.
- **Demo mode keeps drafted clubs selectable** (demo drafts can't be opened without Studio),
  so the demo and e2e can run repeatedly. In Sanity mode a club with any page, draft or
  published, is not offered.
- **Playwright stops the server with SIGTERM** (`gracefulShutdown`): `next start` runs its
  server as a detached process, and the default kill left it orphaned on the port.
- **Admin basic auth fails closed**: 503 if `ADMIN_USER`/`ADMIN_PASSWORD` are unset;
  credentials compared in constant time.

## Known issues
- Real Gemini behaviour (answer quality, refusal wording, structured output of the drafter)
  is untested: there is no API key in this environment. Everything runs against the
  deterministic mocks until `GOOGLE_GENERATIVE_AI_API_KEY` is set and `AI_MOCK=0`.
- A model failure mid-answer shows the partial answer plus the fallback line, labelled
  pending in the asker's session, although it is not saved.
- GitHub repo `huchu19/club-launch` does not exist yet, so nothing has been pushed and CI has
  not run. Commits are local on `main`.

## Human checkpoints
- **C (after M2):** in sanity.io/manage → API → Webhooks, create a webhook: URL
  `<site>/api/revalidate`, dataset `production`, trigger on create/update/delete, filter
  `_type in ["club", "clubPage", "faqItem", "market"]`, projection
  `{_type, "slug": slug.current, "clubSlug": club->slug.current}`, secret =
  `SANITY_REVALIDATE_SECRET`, HTTP method POST. Then run `pnpm seed`.
- **B (after M1):** create a second Vercel project for Storybook (build `pnpm build-storybook`,
  output `storybook-static`).
- **A (after M0):** create the GitHub repo and push; import into Vercel; add env vars; add the
  Vercel URL as a Sanity CORS origin; confirm the deployed `/studio` loads.

## M7 — Package
Acceptance
- [ ] README complete, links to live app and Storybook — README written (problem, features,
  Mermaid architecture, decisions, AI safety, testing, local setup, next steps). The three
  links are marked "added after deploy" until checkpoints A/B give the URLs.
- [ ] Production smoke test passes — needs the Vercel deployment. Script below.

### Production smoke test (run after deploy)
1. `/` loads, lists Linden Mayfair; dark mode (OS setting) and 390 px width look right.
2. `/uk/clubs/linden-mayfair` renders all six blocks with Sanity images; view source shows
   the `HealthClub` JSON-LD and a canonical URL on the Vercel domain.
3. `/sitemap.xml` lists the page; `/robots.txt` disallows `/studio`, `/admin`, `/api`.
4. Book a tour with the keyboard only → success message with a `TOUR-` reference; Vercel logs
   show one redacted `[crm:mock]` line.
5. Ask "Is there a steam room?" → streamed answer with "New — awaiting review"; it appears in
   Studio under FAQ → Pending review.
6. `/admin/draft` asks for credentials; `/studio` shows the Sanity login.
7. Edit the Mayfair hero heading in Studio → Publish → reload the live page within ~10 s.

## Demo script (2-minute video)
Setup: run `pnpm seed --reset` beforehand. Open three tabs: the live Mayfair page, `/studio`,
and `/admin/draft`.

1. **0:00–0:15 — The page.** Scroll the Mayfair page: hero, facilities, "The garden",
   membership, tour form, FAQ. "Every section is a block editors arrange in the CMS."
2. **0:15–0:40 — Edit → publish → live.** In Studio, open Club pages → Linden Mayfair, change
   the hero heading, Publish. Switch tabs and reload: the new heading is live without a
   redeploy (signed webhook → `revalidateTag`).
3. **0:40–1:20 — The drafter.** In `/admin/draft`, pick Linden Moorgate, paste the brief
   "Announce the conversion from a standard gym. Lead with recovery and the reformer studio;
   keep it calm." and choose Premium. Show the placeholder list ("Nothing has been
   published"), click "Open the draft in the studio": the caution banner lists the
   placeholders and Publish is blocked by validation. Replace the dates and prices (e.g.
   199, 150, "March 2027"), add a hero image, Publish, then open
   `/uk/clubs/linden-moorgate`.
4. **1:20–1:50 — Infinite FAQ.** On Mayfair, ask "Is the thermal suite included in every
   membership?" The answer streams in and joins the list as "New — awaiting review". Open a
   private window: it isn't there. In Studio → FAQ → Pending review, open it, set Approved,
   Publish. Reload the private window: now everyone sees it.
5. **1:50–2:00 — Safety net.** Ask "Can you recommend exercises for my bad knee?" → polite
   refusal pointing to a tour. Close on the Storybook and the CI badge.
