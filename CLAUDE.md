# Engineering standards

Club Launch is a CMS-driven platform for launching social wellness club pages. One Next.js app on
Vercel serves the public club pages, an embedded Sanity Studio at `/studio`, an admin page drafter
at `/admin/draft`, and the API routes. The product spec is in [docs/SPEC.md](docs/SPEC.md), the
visual identity in [docs/DESIGN.md](docs/DESIGN.md), and the system design in
[docs/architecture.md](docs/architecture.md).

## Stack
- Next.js App Router, React, TypeScript `strict`, pnpm, Node LTS. Versions are pinned in
  `package.json`; check the installed version's documentation before relying on an API, as
  several of these libraries changed significantly between majors.
- Tailwind CSS with design tokens as CSS variables (docs/DESIGN.md)
- Sanity: embedded Studio, `next-sanity`, GROQ, a private dataset read server-side with a token
- Storybook for Next.js with the a11y addon and Vitest-based component tests
- Vercel AI SDK (`ai`) with `@ai-sdk/google` (Gemini free tier)
- zod for all external input and all AI output
- Vitest, Playwright, `@axe-core/playwright`, ESLint, Prettier, GitHub Actions

## Commands
These must keep working:
- `pnpm dev`, `pnpm build`, `pnpm start`
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm e2e` (Playwright)
- `pnpm storybook`, `pnpm build-storybook`, `pnpm test-storybook`
- `pnpm seed` (seeds Sanity with demo content)

## Data and secrets
- Secrets live only in `.env.local` (gitignored), Vercel and GitHub Actions. `.env.example` lists
  every variable name. Secrets are never hard-coded, committed, logged or exposed through
  `NEXT_PUBLIC_*`.
- Form submissions and personal data never go to the model. Only public club content and the
  visitor's own question or planning prompt, with contact details redacted, are sent to Gemini.

## AI
- AI output never publishes anything. It creates Sanity drafts or unapproved FAQ items only.
- Every API input and every AI response is validated with zod. Invalid AI output is retried once,
  then the user gets a clear error.
- With `AI_MOCK=1`, every AI call returns a deterministic fixture. CI and e2e always run with
  `AI_MOCK=1`.

## Components and content
- Every Sanity page block maps one-to-one to a React component with Storybook stories. No block
  ships without its stories.
- Server Components by default; client components only where interaction needs them.
- All content is fictional: the operator ("Linden"), its clubs and staff are invented, and imagery
  is generated placeholder art or licensed stock. No real operator's names, logos, copy or imagery.

## Accessibility
WCAG 2.2 AA: keyboard reachable, visible focus, labelled inputs, zoom never disabled, and motion
turned off under `prefers-reduced-motion`.

## Cost
Everything runs on free tiers. No paid services.

## Git and releases
- Conventional commits that say what changed and why.
- One branch and pull request per change. Merge only when CI is green, then confirm the Vercel
  production deploy and smoke-test the club page.
- Never force-push, rewrite history or delete branches.
- Keep the README feature list, docs/architecture.md and docs/roadmap.md current as features land.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
