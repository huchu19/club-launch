# PLAN — milestones (deadline: Monday 28 September, morning)

Each milestone ends green (`lint`, `typecheck`, `test`, `build`), committed and pushed.

## M0 — Setup (Fri night)
- Next.js App Router + TypeScript strict + Tailwind + ESLint + Prettier, pnpm.
- Sanity Studio embedded at `/studio`, schemas folder, `next-sanity` client (server-only, token reads).
- `.env.example` complete (SPEC §8). Basic-auth middleware for `/admin` and `/api/admin`.
- GitHub Actions `ci.yml`: install, lint, typecheck, test, build (with `AI_MOCK=1` and dummy env values).
**Acceptance**
- [ ] `pnpm dev` serves `/` and `/studio` locally
- [ ] CI passes on push
**HUMAN CHECKPOINT A:** import repo into Vercel, add env vars to Vercel, add Sanity CORS origin for the Vercel URL. Confirm the deployed `/studio` loads.

## M1 — Design system + Storybook (Fri night → Sat morning)
- Tokens from docs/DESIGN.md as CSS variables + Tailwind theme.
- Storybook (Next.js framework) with a11y addon, light/dark toggle, mobile viewport.
- Base components and the six block components (SPEC §3), all presentational with typed props, each with stories (default, dark, mobile, edge cases like long text / missing image).
- Storybook component tests run in CI (`test-storybook` or the Vitest addon); a11y violations fail the build.
**Acceptance**
- [ ] Every component has stories; `pnpm build-storybook` succeeds
- [ ] Zero serious/critical a11y violations in Storybook
- [ ] CI runs Storybook tests
**HUMAN CHECKPOINT B:** create a second Vercel project for Storybook (build `pnpm build-storybook`, output `storybook-static`). Confirm the URL.

## M2 — CMS + Mayfair-style page (Sat)
- Schemas: market, club, clubPage (+ six blocks), faqItem, with validation (required alt text, placeholder rule from SPEC §6).
- Block renderer mapping each block `_type` to its component.
- `/[market]/clubs/[slug]` route, `/` club index, metadata, JSON-LD, sitemap, robots.
- On-demand revalidation route with signature check; draft mode preview from Studio.
- `pnpm seed`: creates market `uk`, Mayfair-style club + full page, Moorgate-style club (facts only, no page), 5 approved FAQs for Mayfair. Idempotent.
**Acceptance**
- [ ] Mayfair-style page renders fully from Sanity content
- [ ] Editing and publishing in Studio updates the live page within ~10 s without redeploy
- [ ] JSON-LD validates (schema.org structure), sitemap lists the page
**HUMAN CHECKPOINT C:** in Sanity manage, create the GROQ-powered webhook to `/api/revalidate` with the secret. Run `pnpm seed` against production dataset if not already.

## M3 — Tour booking (Sat)
- Tour form in `tourBookingBlock`, zod on client + server, honeypot, rate limit, `CrmAdapter` + `MockCrmAdapter` (SPEC §4).
- Accessible errors (field-level, announced), success state, input preserved on failure.
- Vitest: schema tests, adapter retry behaviour, rate limiter.
**Acceptance**
- [ ] Valid submission shows success; invalid shows field errors; keyboard-only works
- [ ] Unit tests cover validation, retry and rate limiting

## M4 — Infinite FAQ (Sun)
- `faqBlock` accordion + "Anything else?" with streaming (AI SDK `useChat`/`useCompletion` or equivalent for the installed version).
- `/api/faq` exactly as SPEC §5: cache by normalised question, grounding, refusals, pending save, quota fallback.
- `AI_MOCK=1` fixtures: an in-context answer, an out-of-context refusal, a quota error.
**Acceptance**
- [ ] Asking a new question streams an answer and adds a pending item (visible only to the asker)
- [ ] Repeating the same question does not call Gemini
- [ ] Approving in Studio makes it visible to everyone
- [ ] Off-topic / medical / unknown price questions get the polite refusal
- [ ] Unit tests for normalisation, grounding context builder, refusal path (mocked)

## M5 — AI page drafter (Sun)
- `/admin/draft` UI and `/api/admin/draft` as SPEC §6, `generateObject` with strict zod schema, retry once.
- Studio warning banner + publish-blocking validation for `[[` placeholders.
**Acceptance**
- [ ] A brief for the Moorgate-style club creates a draft page in Studio with flagged placeholders
- [ ] Draft cannot be published until placeholders are replaced; after replacing, publishing makes it live
- [ ] Unit test: invalid model output → one retry → clear error

## M6 — Test hardening (Sun night)
- Playwright (with `AI_MOCK=1`): (1) book a tour keyboard-only, (2) ask an FAQ question and see it appear. axe check on the club page in both flows.
- Add `pnpm e2e` to CI (build + start, then run).
**Acceptance**
- [ ] Both e2e flows pass locally and in CI
- [ ] Full CI pipeline green

## M7 — Package (Mon morning)
- README per SPEC §11 with a Mermaid architecture diagram.
- Final deploy, smoke test every route on production, check dark mode and mobile.
- List in docs/PROGRESS.md the exact demo script for the 2-minute video: Studio edit → publish → live; drafter creates Moorgate-style page → fix placeholders → publish; ask a new FAQ question → approve in Studio.
**Acceptance**
- [ ] README complete, links to live app and Storybook
- [ ] Production smoke test passes

## Cut order if behind schedule
1. Second Playwright flow (keep the tour one)
2. Draft-mode preview
3. Club index page (link clubs directly)
4. Storybook mobile stories
Never cut: M4, M5, the placeholder safeguard, zod validation, AI_MOCK in CI.
