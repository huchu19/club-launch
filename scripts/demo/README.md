# Automated demo recording

Records the two-minute walkthrough in `.agent/DEMO_VIDEO.md` against a real
deployment, with a visible cursor and on-screen captions, and converts it to an
MP4. Everything it creates in Sanity is marked and removed again.

## Running it

```sh
pnpm demo:login     # once: sign in to the Studio (and GitHub) in a visible window
pnpm demo:reset     # delete anything a previous run created  (--dry-run to look first)
pnpm demo:record    # resets, then records every scene
pnpm demo:build     # .webm → .demo/out/club-launch-demo.mp4 (H.264, no audio)
```

Output lands in `.demo/` (gitignored): `auth.json` holds a real session, and
`out/` holds the video, `scenes.json` and `captions.srt`.

Run it on your own machine, not in a dev container: both `demo:login` and
`demo:record` open a real browser window.

| Variable         | Default                              | Why                                     |
| ---------------- | ------------------------------------ | --------------------------------------- |
| `DEMO_BASE_URL`  | `https://club-launch-kappa.vercel.app` | Which deployment to record              |
| `DEMO_SCENES`    | every scene                          | `DEMO_SCENES=6` to iterate on one shot   |
| `DEMO_HEADLESS`  | unset                                | `1` rehearses scenes 1–5 without a window |
| `DEMO_ACTIONS_URL` | the repo's Actions page            | Scene 8; `DEMO_SKIP_ACTIONS=1` drops it  |

`ADMIN_USER`, `ADMIN_PASSWORD`, the Sanity project id and
`SANITY_API_WRITE_TOKEN` come from `.env.local`.

## How it works

- `config.ts` — the deployment, the fixed demo input, the scene captions and
  their end times from the shot list, and the values that replace placeholders.
- `cursor.ts`, `stage.ts` — the injected cursor, click ripple, caption bar and
  URL chip (a Playwright video has no browser chrome), plus human-paced mouse,
  typing and scrolling helpers and the scene clock. A scene that finishes early
  holds its last frame until its slot ends, so the cut stays close to 2:00.
- `record.ts` — one function per scene, in the order of the shot list.
- `sanity.ts`, `reset.ts` — the ledger of created documents and the four narrow
  rules reset deletes by.

The recording runs against the real AI (three Gemini calls per take: the
concierge, the drafter and one FAQ answer), so takes cost quota. Keep them a
minute apart if the free tier starts refusing.

## What it creates, and what reset removes

A take creates a day plan, a pending FAQ answer, and the drafted club's page
(draft, then published). Each is marked with a hidden `demo: true` field and
written to `.demo/created.json`. `demo:reset` deletes, logging each one:

1. the documents in that ledger,
2. anything still carrying `demo: true`,
3. any page belonging to the drafted club, which has no page between takes,
4. the AI answer to the demo's own question.

Seeded documents are protected by id, and clubs and markets are never deleted.
Tour requests go to the mock CRM, which only logs, so nothing to clean up there.

## Two things to know before recording

- **Scene 6 fills the placeholders through the API, not by typing in the Studio
  form.** The Studio is open on screen and shows the fields, the warning banner
  and the launch checklist updating live, and the publish click itself is real —
  it is blocked before, and goes through after. Editing deeply nested array
  fields through the Studio UI was not reliable enough to record unattended.
- **Selectors in the Studio are the fragile part** (the publish action, the FAQ
  status radio). If the Studio changes, scenes 6 and 7 are where it will break;
  everything on the club page uses the same accessible names as the e2e tests.
