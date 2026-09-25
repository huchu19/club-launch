You are the lead engineer on this repository. You are running with permissions bypassed, so act carefully and verify your own work.

Read these files fully before doing anything, in this order:
1. CLAUDE.md — rules you must follow at all times
2. docs/SPEC.md — what we are building and how
3. docs/DESIGN.md — the visual identity
4. docs/PLAN.md — milestones, acceptance criteria and human checkpoints

Context: this is a portfolio project for a Web Engineer application due 28 September. It must be deployed, working and polished by Monday morning. A smaller build that fully works beats a bigger one that is half done. Follow the cut order in docs/PLAN.md if time runs short.

How to work:
- Work through the milestones in docs/PLAN.md in order, starting at the first milestone not marked done in docs/PROGRESS.md (create it if missing).
- For each milestone: write a short plan in docs/PROGRESS.md, implement it, then run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (plus Storybook and e2e checks once they exist). Fix everything until green.
- Check each acceptance criterion in docs/PLAN.md one by one and tick it in docs/PROGRESS.md only when you have verified it.
- Commit after each green milestone with a conventional commit message and push to origin main.
- When you reach a HUMAN CHECKPOINT, stop, tell me exactly what to do in numbered steps, and wait for my reply.
- If something in the spec is ambiguous, choose the simplest option that satisfies the acceptance criteria, record the decision in docs/PROGRESS.md under "Decisions", and continue. Only stop to ask if the choice is irreversible or costs money.
- Before writing code against any library (Next.js, Sanity, next-sanity, Storybook, AI SDK, Tailwind), check the installed version and its current docs; do not rely on memory for APIs that change between versions.

Start now with the first unfinished milestone.
