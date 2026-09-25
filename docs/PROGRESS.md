# PROGRESS

## Milestones
- [x] M0 Setup (local; CI and Vercel pending checkpoint A)
- [x] M1 Design system + Storybook (local; Storybook deploy pending checkpoint B)
- [x] M2 CMS + Mayfair-style page (demo content verified; live Sanity pending checkpoints A/C)
- [ ] M3 Tour booking
- [ ] M4 Infinite FAQ
- [ ] M5 AI page drafter
- [ ] M6 Test hardening
- [ ] M7 Package

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
- [ ] Studio edit → live within ~10 s without redeploy — implemented (tagged `force-cache`
  reads, signed webhook calling `revalidateTag(tag, { expire: 0 })`, unit-tested with real
  Sanity signatures incl. bad signature/payload/missing secret). Needs the webhook (checkpoint C)
  to verify end to end.
- [x] JSON-LD validates, sitemap lists the page — `HealthClub` typed with `schema-dts`
  (compile-time schema.org check) plus unit tests for address, geo and grouped
  `openingHoursSpecification`; `<` is escaped. `/sitemap.xml` lists `/` and the Mayfair page;
  `/robots.txt` disallows `/studio`, `/admin`, `/api`.

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
- **Admin basic auth fails closed**: 503 if `ADMIN_USER`/`ADMIN_PASSWORD` are unset;
  credentials compared in constant time.

## Known issues
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

## Demo script (filled in M7)
