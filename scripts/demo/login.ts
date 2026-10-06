// One-time sign-in for the recording. Opens Playwright's own Chromium window,
// waits for the Sanity Studio to load (sign in however you normally would) and
// saves the session to .demo/auth.json, which `pnpm demo:record` reuses.
//
// Scene 8 shows GitHub Actions, so the same window is left open for you to sign
// in to GitHub too if that repository is private.
import { mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { chromium } from 'playwright'
import { actionsUrl, authFile, demoDir, pace, url } from './config'
import { message } from './sanity'

async function main() {
  mkdirSync(demoDir, { recursive: true })
  console.log(`Opening ${url('/studio')} — sign in when the window appears.`)

  const browser = await chromium.launch({ headless: false, args: ['--window-size=1440,960'] })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()
  await page.goto(url('/studio'), { waitUntil: 'domcontentloaded', timeout: 60_000 })

  // The structure pane's first list item means the Studio is loaded and signed in.
  await page
    .getByText('Club pages', { exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: 5 * 60_000 })
  console.log('Studio loaded.')
  await page.waitForTimeout(pace.read)

  if (actionsUrl) {
    console.log(`Opening ${actionsUrl} — sign in as well if the repository is private.`)
    await page.goto(actionsUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {})
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  await rl.question('\nPress Enter here once everything is signed in… ')
  rl.close()

  await context.storageState({ path: authFile })
  await browser.close()
  console.log(`Saved the session to ${authFile}. It is gitignored; it holds real credentials.`)
}

main().catch((error: unknown) => {
  console.error('Login failed:', message(error))
  process.exit(1)
})
