// Records the demo walkthrough from .agent/DEMO_VIDEO.md, one function per
// scene, against a real deployment with real AI calls.
//
//   pnpm demo:record                  reset, then record every scene
//   DEMO_SCENES=6 pnpm demo:record    record one scene while iterating
//   DEMO_BASE_URL=http://localhost:3000 pnpm demo:record
//
// Headed on purpose: the saved Studio session comes from a real sign-in.
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import type { SanityClient } from '@sanity/client'
import { chromium, type Locator, type Page } from 'playwright'
import { studioEditPath } from '../../lib/studio'
import {
  actionsUrl,
  admin,
  authFile,
  baseUrl,
  clubPath,
  draftedClub,
  openClub,
  outDir,
  pace,
  rawDir,
  rawVideo,
  script,
  scenes,
  selectedScenes,
} from './config'
import { resetDemoContent } from './reset'
import { demoSanityClient, fillPlaceholders, message, noteCreated, recordCreated } from './sanity'
import { Stage, waitUntil, writeCaptionFiles } from './stage'

type Ctx = {
  stage: Stage
  page: Page
  client: SanityClient
  /** Ids the scenes hand to each other and to the ledger. */
  made: { planId?: string; draftId?: string; faqId?: string }
}

const visible = (locator: Locator, timeout = 15_000) =>
  locator.first().waitFor({ state: 'visible', timeout })

const gone = (locator: Locator, timeout = 15_000) =>
  locator.first().waitFor({ state: 'hidden', timeout })

/** The Studio's publish action, by test id with a label fallback. */
const publishButton = (page: Page) =>
  page
    .getByTestId('action-publish')
    .or(page.getByRole('button', { name: /^Publish$/ }))
    .first()

/** Sanity blocks publishing with either the disabled attribute or aria-disabled. */
async function publishBlocked(page: Page): Promise<boolean> {
  const button = publishButton(page)
  if (await button.isDisabled()) return true
  return (await button.getAttribute('aria-disabled')) === 'true'
}

/** The next weekday at least `minDays` away, as YYYY-MM-DD. */
function nextWeekday(minDays = 4): string {
  const date = new Date()
  date.setDate(date.getDate() + minDays)
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Steps a range input to `target` with the arrow keys, so each step is seen. */
async function setSlider(ctx: Ctx, slider: Locator, target: number) {
  await ctx.stage.click(slider)
  for (let i = 0; i < 12; i++) {
    const value = Number(await slider.inputValue())
    if (value === target) return
    await ctx.page.keyboard.press(value < target ? 'ArrowRight' : 'ArrowLeft')
    await ctx.stage.hold(260)
  }
  console.warn(`  (the visits slider did not reach ${target})`)
}

/** Reloads until `check` passes, for content that goes live through a webhook. */
async function reloadUntil(ctx: Ctx, check: () => Promise<boolean>, what: string) {
  const deadline = Date.now() + pace.revalidate
  for (;;) {
    if (await check()) return true
    if (Date.now() > deadline) {
      console.warn(`  (${what} had not gone live after ${pace.revalidate / 1000}s)`)
      return false
    }
    await ctx.stage.hold(3_000)
    await ctx.stage.reload()
  }
}

// ── Scene 1 ─────────────────────────────────────────────────────────────────
// The club page in its current time-of-day look, with a slow opening scroll.
async function openingShot(ctx: Ctx) {
  await ctx.stage.goto(clubPath(openClub.slug))
  await visible(ctx.page.getByRole('heading', { level: 1 }))
  await ctx.stage.hold(2_200)
  await ctx.stage.scrollTo(260)
  await ctx.stage.scrollTo(620)
}

// ── Scene 2 ─────────────────────────────────────────────────────────────────
// The club map: hover two zones, open the spa, then add it to the day.
async function clubMap(ctx: Ctx) {
  const { page, stage } = ctx
  await stage.scrollToId('map')
  const zone = (name: string) => page.getByRole('radio', { name })

  await stage.moveTo(zone('Garden kitchen, Food and drink'))
  await stage.hold(700)
  await stage.moveTo(zone("Members' workspace, Co-working"))
  await stage.hold(700)

  // The spa and recovery spaces are on the lower ground floor.
  await stage.click(page.getByRole('tab', { name: 'Lower ground floor' }))
  await stage.click(zone('Thermal suite, Spa'))
  const details = page.getByRole('region', { name: 'Space details' })
  await visible(details.getByText('Thermal suite'))
  await stage.reveal(details)
  await stage.hold(pace.read)

  await stage.click(details.getByRole('button', { name: 'Add to my day' }))
  await visible(page.getByLabel('Tell us about your week'))
}

// ── Scene 3 ─────────────────────────────────────────────────────────────────
// The concierge plans a first day, with a caveat for the health mention.
async function concierge(ctx: Ctx) {
  const { page, stage } = ctx
  const field = page.getByLabel('Tell us about your week')
  await stage.retype(field, script.conciergeMessage)
  await stage.click(page.getByRole('button', { name: script.chip }))

  const planned = page.waitForResponse((r) => r.url().includes('/api/concierge'), {
    timeout: pace.aiTimeout,
  })
  await stage.click(page.getByRole('button', { name: 'Plan my day' }))

  const response = await planned
  const body = (await response.json().catch(() => null)) as {
    status?: string
    plan?: { id?: string }
    message?: string
  } | null
  if (body?.status !== 'planned') {
    throw new Error(
      `The concierge did not plan a day (${response.status()} ${body?.status ?? 'no status'}): ${body?.message ?? ''}`,
    )
  }
  if (body.plan?.id) {
    ctx.made.planId = body.plan.id
    await recordCreated(ctx.client, `dayPlan-${body.plan.id}`, 'day plan from the concierge')
  }

  const heading = page.getByRole('heading', { name: /^Your \w+day at / })
  await visible(heading, pace.aiTimeout)
  const stops = page.getByRole('list', { name: /stop by stop/ })
  await visible(stops)
  await stage.reveal(heading)
  await stage.hold(2_000)
  // The timeline is taller than the fold: show the later stops, and the caveat
  // if the health mention earned one.
  await stage.reveal(stops.getByRole('listitem').last())
  await stage.hold(1_200)
  const caveat = page.getByText('Before you go')
  if ((await caveat.count()) > 0) await stage.reveal(caveat)
  await stage.hold(pace.read)
}

// ── Scene 4 ─────────────────────────────────────────────────────────────────
// Booking a tour from the plan: the lead carries the day the visitor planned.
async function bookTour(ctx: Ctx) {
  const { page, stage } = ctx
  await stage.click(page.getByRole('button', { name: 'Book a tour for this day' }))
  await visible(page.getByText(/plan is attached$/))

  await stage.type(page.getByLabel('Full name'), script.visitor.name)
  await stage.type(page.getByLabel('Email address'), script.visitor.email)
  await stage.click(page.getByLabel('Preferred date'))
  await page.getByLabel('Preferred date').fill(nextWeekday())
  await stage.hold(400)
  await stage.select(page.getByLabel('Time of day'), { value: script.visitor.timeSlot })
  await stage.click(page.getByRole('checkbox', { name: /can contact me/ }))
  await stage.click(page.getByRole('button', { name: 'Request a tour' }))

  const thanks = page.getByText(/Thank you, Demo\./)
  await visible(thanks, 20_000)
  await visible(page.getByText(/Reference: TOUR-/))
  await stage.reveal(thanks)
  await stage.hold(pace.read)
}

// ── Scene 5 ─────────────────────────────────────────────────────────────────
// The cost calculator: premium price reframed as a cost per visit.
async function calculator(ctx: Ctx) {
  const { page, stage } = ctx
  await stage.scrollToId('cost')
  const slider = page.getByRole('slider', { name: 'How often would you visit?' })
  await setSlider(ctx, slider, 2)
  await stage.hold(900)
  await setSlider(ctx, slider, 4)
  await stage.hold(700)
  await stage.click(page.getByRole('checkbox', { name: 'The spa' }))
  await stage.click(page.getByRole('checkbox', { name: 'Co-working' }))
  await stage.hold(pace.read)
}

// ── Scene 6 ─────────────────────────────────────────────────────────────────
// The editor's side: draft a page from one line, fill the placeholders the AI
// refused to invent, watch the publish gate open, then see it live.
async function drafter(ctx: Ctx) {
  const { page, stage, client } = ctx
  await stage.goto('/admin/draft')
  await visible(page.getByRole('heading', { level: 1, name: 'Draft a club page' }))

  await stage.select(page.getByLabel('Club'), { label: draftedClub.name })
  await stage.type(page.getByLabel('Brief'), script.brief)
  await stage.select(page.getByLabel('Tone'), { value: script.tone })

  const drafted = page.waitForResponse((r) => r.url().includes('/api/admin/draft'), {
    timeout: pace.studioTimeout,
  })
  await stage.click(page.getByRole('button', { name: 'Draft the page' }))
  const response = await drafted
  const body = (await response.json().catch(() => null)) as {
    draftId?: string
    error?: string
  } | null
  if (!body?.draftId) {
    throw new Error(`The drafter failed (${response.status()}): ${body?.error ?? 'no draft id'}`)
  }
  ctx.made.draftId = body.draftId
  await recordCreated(client, body.draftId, `${draftedClub.name} page draft`)

  await visible(
    page.getByText(`Draft created for ${draftedClub.name}. Nothing has been published.`),
    pace.studioTimeout,
  )
  const placeholders = page.getByRole('heading', { name: 'Placeholders to replace' })
  await visible(placeholders)
  await stage.reveal(placeholders)
  await stage.hold(2_600)

  // Into the Studio, where the draft cannot be published yet.
  await stage.click(page.getByRole('link', { name: 'Open the draft in the studio' }))
  const banner = page.getByText(/to replace before publishing/)
  await visible(banner, pace.studioTimeout)
  const checklist = page.getByText(/Launch checklist: \d+% ready/)
  await visible(checklist)
  await stage.hold(2_400)
  await stage.moveTo(publishButton(page))
  console.log(
    (await publishBlocked(page))
      ? '  publishing is blocked, as it should be'
      : '  WARNING: the publish button was not blocked',
  )
  await stage.hold(2_000)

  // The editor replaces every placeholder with a confirmed value. The Studio is
  // open on screen and shows the fields, the banner and the checklist change.
  await fillPlaceholders(client, body.draftId)
  await gone(banner, 30_000)
  await gone(checklist, 15_000)
  await stage.hold(1_600)

  await stage.click(publishButton(page))
  const publishedId = body.draftId.replace(/^drafts\./, '')
  await waitUntil(async () => Boolean(await client.getDocument(publishedId)), {
    timeout: pace.studioTimeout,
    what: `${draftedClub.name}'s page to be published`,
  })
  noteCreated(publishedId, `${draftedClub.name} published page`)
  await stage.hold(1_400)

  // Live, with no redeploy.
  await stage.goto(clubPath(draftedClub.slug))
  await reloadUntil(
    ctx,
    async () => (await page.getByRole('heading', { level: 1 }).count()) > 0,
    `the ${draftedClub.name} page`,
  )
  await stage.hold(pace.read)
}

// ── Scene 7 ─────────────────────────────────────────────────────────────────
// The infinite FAQ: an answer from this club's facts only, private until an
// editor approves it.
async function faq(ctx: Ctx) {
  const { page, stage, client } = ctx
  await stage.goto(clubPath(openClub.slug))
  await stage.scrollToId('faq')

  const answered = page.waitForResponse((r) => r.url().includes('/api/faq'), {
    timeout: pace.aiTimeout,
  })
  await stage.type(page.getByLabel('Anything else?'), script.faqQuestion)
  await stage.click(page.getByRole('button', { name: 'Ask' }))
  const response = await answered
  const faqId = response.headers()['x-faq-id']
  const status = response.headers()['x-faq-status']
  if (!faqId || status !== 'pending') {
    throw new Error(`The FAQ answer was not saved for review (status: ${status ?? 'none'})`)
  }
  ctx.made.faqId = faqId
  await recordCreated(client, faqId, 'AI answer awaiting review')

  const item = page.locator('details').filter({ hasText: script.faqQuestion })
  await visible(item.getByText('New — awaiting review'), pace.aiTimeout)
  await stage.hold(2_400)

  // The editor approves it in the Studio.
  await stage.goto(studioEditPath(faqId, 'faqItem'))
  const approved = page.getByRole('radio', { name: 'Approved' }).or(page.getByLabel('Approved'))
  await visible(approved, pace.studioTimeout)
  await stage.hold(1_200)
  await stage.click(approved)
  await stage.hold(800)
  await stage.click(publishButton(page))
  await waitUntil(
    async () => {
      const doc = await client.getDocument<{ status?: string }>(faqId)
      return doc?.status === 'approved'
    },
    { timeout: pace.studioTimeout, what: 'the approved answer to be published' },
  )
  await stage.hold(1_200)

  // Now everyone sees it.
  await stage.goto(`${clubPath(openClub.slug)}#faq`)
  await reloadUntil(
    ctx,
    async () => {
      await page
        .locator('details')
        .filter({ hasText: script.faqQuestion })
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => {})
      const listed = await page.locator('details').filter({ hasText: script.faqQuestion }).count()
      const pending = await page.getByText('New — awaiting review').count()
      return listed > 0 && pending === 0
    },
    'the approved answer',
  )
  await stage.scrollToId('faq')
  await stage.click(page.locator('summary').filter({ hasText: script.faqQuestion }).first())
  await stage.hold(pace.read)
}

// ── Scene 8 ─────────────────────────────────────────────────────────────────
// CI, then back to the club page with its URL on screen.
async function closingShot(ctx: Ctx) {
  const { page, stage } = ctx
  if (actionsUrl) {
    try {
      await stage.gotoUrl(actionsUrl)
      if ((await page.getByText(/Sign in to GitHub/i).count()) > 0) {
        console.warn('  (GitHub asked for a sign-in; run pnpm demo:login again)')
      }
      await stage.hold(4_500)
    } catch (error) {
      console.warn('  (could not open GitHub Actions):', message(error))
    }
  }
  await stage.goto(clubPath(openClub.slug))
  await visible(page.getByRole('heading', { level: 1 }))
  await stage.hold(2_000)
}

const sceneRunners: Record<number, (ctx: Ctx) => Promise<void>> = {
  1: openingShot,
  2: clubMap,
  3: concierge,
  4: bookTour,
  5: calculator,
  6: drafter,
  7: faq,
  8: closingShot,
}

async function main() {
  const chosen = selectedScenes()
  console.log(`Recording ${baseUrl} — scenes ${chosen.join(', ')}`)
  if (!existsSync(authFile)) {
    throw new Error(`No saved Studio session at ${authFile}. Run "pnpm demo:login" first.`)
  }
  if (chosen.includes(6) && (!admin.user || !admin.password)) {
    throw new Error('ADMIN_USER and ADMIN_PASSWORD must be set in .env.local for /admin.')
  }

  await resetDemoContent()
  rmSync(rawDir, { recursive: true, force: true })
  mkdirSync(rawDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })

  const client = demoSanityClient()
  // Headed by default: the saved Studio session comes from a real sign-in, and
  // a visible window is what the shot list assumes. DEMO_HEADLESS=1 is for
  // rehearsing the mechanics (scenes 1–5) without a window popping up.
  const browser = await chromium.launch({
    headless: process.env.DEMO_HEADLESS === '1',
    args: ['--window-size=1920,1080'],
  })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
    storageState: authFile,
    ...(admin.user && admin.password
      ? { httpCredentials: { username: admin.user, password: admin.password } }
      : {}),
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  })
  context.setDefaultTimeout(20_000)

  const page = await context.newPage()
  const stage = new Stage(page)
  await stage.open()
  const ctx: Ctx = { stage, page, client, made: {} }

  let failure: unknown
  try {
    for (const id of chosen) {
      await stage.scene(id)
      await sceneRunners[id]?.(ctx)
      await stage.padScene()
    }
    console.log(`\nDone in ${(stage.elapsed / 1000).toFixed(1)}s.`)
  } catch (error) {
    failure = error
    console.error(`\nScene failed: ${message(error)}`)
  }

  const video = page.video()
  const timings = stage.finish()
  // The video is only complete once its context has closed, and must be saved
  // before the browser goes away.
  await context.close()
  if (video) {
    await video.saveAs(rawVideo)
    rmSync(rawDir, { recursive: true, force: true })
    console.log(`Saved ${rawVideo}`)
  }
  await browser.close()
  writeCaptionFiles(timings)
  if (chosen.length === scenes.length && !failure) {
    console.log('Next: pnpm demo:build')
  }
  if (failure) process.exit(1)
}

main().catch((error: unknown) => {
  console.error('Recording failed:', message(error))
  process.exit(1)
})
