# CLAUDE.md — project rules

## Project
A CMS-driven platform for launching social wellness club pages. One Next.js app on Vercel serves public club pages, an embedded Sanity Studio at `/studio`, an admin AI page drafter at `/admin/draft`, and API routes. Full detail: docs/SPEC.md.

## Stack (use latest stable versions; check docs before use)
- Next.js App Router, React, TypeScript `strict`, pnpm, Node LTS
- Tailwind CSS with design tokens as CSS variables (docs/DESIGN.md)
- Sanity (embedded Studio, `next-sanity`, GROQ, private dataset, server-side reads with a token)
- Storybook for Next.js with the a11y addon and Vitest-based component tests
- Vercel AI SDK (`ai`) with `@ai-sdk/google` (Gemini free tier)
- zod for all external input and all AI output
- Vitest, Playwright, `@axe-core/playwright`, ESLint, Prettier, GitHub Actions

## Commands (keep these working)
- `pnpm dev`, `pnpm build`, `pnpm start`
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm e2e` (Playwright)
- `pnpm storybook`, `pnpm build-storybook`, `pnpm test-storybook`
- `pnpm seed` (seeds Sanity with demo content)

## Hard rules
- Never read, print, or modify `.env.local`. Use `.env.example` for variable names. Never hard-code secrets or commit them.
- Never send form submissions or any personal data to Gemini. Only public club content and visitor FAQ questions go to the model.
- AI output never publishes anything. It only creates Sanity drafts or unapproved FAQ candidates.
- Every page block in Sanity maps one-to-one to a Storybook component. No block ships without a story.
- Validate every API input and every AI response with zod. Invalid AI output: retry once, then return a clear error.
- When `AI_MOCK=1`, all AI calls return deterministic fixtures. CI and e2e always run with `AI_MOCK=1`.
- Accessibility: WCAG 2.2 AA. Keyboard reachable, visible focus, labelled inputs, never disable zoom.
- No Virgin Active names, logos, copy or imagery anywhere in the app. Use the working platform name from docs/DESIGN.md. Staff are fictional; imagery is licensed stock or generated placeholders.
- Server Components by default; client components only where interaction needs them.
- No new paid services. Everything must run on free tiers.

## Git
- Conventional commits. Commit and push after every green milestone.
- Never force-push, never rewrite history, never delete branches.

## Progress
Keep docs/PROGRESS.md current: milestone status, ticked acceptance criteria, decisions, known issues.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
