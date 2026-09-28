import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './helpers'

const CLUB = '/uk/clubs/linden-mayfair'

async function createPlan(request: import('@playwright/test').APIRequestContext, ip: string) {
  const res = await request.post('/api/concierge', {
    headers: { 'x-forwarded-for': ip },
    data: {
      clubSlug: 'linden-mayfair',
      // Distinctive words that must never appear on the shared page.
      message: 'I work from home, and my zebra-print laptop bag comes everywhere.',
      chips: ['I work from home'],
    },
  })
  expect(res.ok()).toBe(true)
  return (await res.json()).plan as { id: string; day: string }
}

test('a shared day shows only the structured plan, is never indexed, and has a social image', async ({
  page,
  request,
}) => {
  const plan = await createPlan(request, `192.0.2.${60 + test.info().retry}`)
  await page.goto(`${CLUB}/day/${plan.id}`)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    `A ${plan.day} at Linden Mayfair`,
  )
  await expect(
    page.getByRole('list', { name: /stop by stop/ }).getByRole('listitem'),
  ).not.toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(await page.content()).not.toContain('zebra')
  await expectNoA11yViolations(page)

  // The Open Graph image is generated for this plan.
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(ogImage).toContain(`/day/${plan.id}/opengraph-image`)
  const image = await request.get(new URL(ogImage!).pathname + new URL(ogImage!).search)
  expect(image.status()).toBe(200)
  expect(image.headers()['content-type']).toBe('image/png')
  expect((await image.body()).byteLength).toBeGreaterThan(10_000)

  await page.getByRole('link', { name: 'Book your own tour' }).click()
  await expect(page).toHaveURL(new RegExp(`${CLUB}#tour$`))
})

test('unknown, malformed or other clubs’ plan ids are not found', async ({ request }) => {
  const plan = await createPlan(request, `192.0.2.${70 + test.info().retry}`)
  expect((await request.get(`${CLUB}/day/nosuchplan0000000`)).status()).toBe(404)
  expect((await request.get(`${CLUB}/day/..%2F..%2Fetc`)).status()).toBe(404)
  // The right plan under a different club's URL.
  expect((await request.get(`/uk/clubs/linden-moorgate/day/${plan.id}`)).status()).toBe(404)
})

test('"Share my day" copies the link when the device has no share sheet', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `192.0.2.${80 + test.info().retry}` })
  await page.addInitScript(() => {
    // Desktop Chromium may or may not have a share sheet; test the fallback.
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  })
  await page.goto(CLUB)
  await page.getByLabel('Tell us about your week').fill('I like a calm swim.')
  await page.getByRole('button', { name: 'Plan my day' }).click()
  await page.getByRole('button', { name: 'Share my day' }).click()
  await expect(page.getByText('Link copied. Anyone with the link can see this plan.')).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toMatch(new RegExp(`${CLUB}/day/[a-z0-9]{16}$`))
})
