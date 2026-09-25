import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, tabTo } from './helpers'

const CLUB = '/uk/clubs/linden-mayfair'

test('a new question streams an answer that only the asker sees, and repeats skip the model', async ({
  page,
  browser,
}) => {
  const question = 'Is there a steam room?'
  await page.goto(CLUB)

  await tabTo(page, page.getByLabel('Anything else?'), 150)
  await page.keyboard.type(question)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Ask' })).toBeFocused()

  const response = page.waitForResponse((r) => r.url().endsWith('/api/faq'))
  await page.keyboard.press('Enter')
  expect((await response).headers()['x-faq-status']).toBe('pending')

  const item = page.locator('details').filter({ hasText: question })
  await expect(item.getByText('New — awaiting review')).toBeVisible()
  await expect(item).toHaveAttribute('open', '')
  await expect(item.getByText(/steam room/i).last()).toBeVisible()
  await expect(page.getByLabel('Anything else?')).toHaveValue('')
  await expectNoA11yViolations(page)

  // Still there for this visitor after a reload (same session)…
  await page.reload()
  await expect(
    page.locator('details').filter({ hasText: question }).getByText('New — awaiting review'),
  ).toBeVisible()

  // …but another visitor never sees a pending answer.
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await otherPage.goto(CLUB)
  await expect(otherPage.getByText(question)).toHaveCount(0)

  // When they ask the same thing, it is answered from the saved item, not the model.
  await otherPage.getByLabel('Anything else?').fill('is there a STEAM room')
  const repeat = otherPage.waitForResponse((r) => r.url().endsWith('/api/faq'))
  await otherPage.getByRole('button', { name: 'Ask' }).click()
  const repeatHeaders = (await repeat).headers()
  expect(repeatHeaders['x-faq-source']).toBe('cache')
  expect(repeatHeaders['x-faq-status']).toBe('pending')
  await other.close()
})

test('asking an already answered question opens the existing answer', async ({ page }) => {
  await page.goto(CLUB)
  await page.getByLabel('Anything else?').fill('Can I bring a guest')
  await page.getByRole('button', { name: 'Ask' }).click()
  const existing = page.locator('details').filter({ hasText: 'Can I bring a guest?' })
  await expect(existing).toHaveAttribute('open', '')
  await expect(page.getByText('New — awaiting review')).toHaveCount(0)
})

test('off-topic and medical questions get a polite refusal', async ({ page }) => {
  await page.goto(CLUB)
  await page.getByLabel('Anything else?').fill('Which exercises should I do for my knee injury?')
  await page.getByRole('button', { name: 'Ask' }).click()
  const item = page.locator('details').filter({ hasText: 'knee injury' })
  await expect(item.getByText(/can’t answer that from the information I have/)).toBeVisible()
  await expect(item.getByText(/book a tour/)).toBeVisible()
})

test('when the AI quota is exhausted the visitor gets a friendly fallback', async ({ page }) => {
  await page.goto(CLUB)
  await page.getByLabel('Anything else?').fill('quota: what time does the pool open?')
  await page.getByRole('button', { name: 'Ask' }).click()
  // Shown on screen and announced via the status region.
  await expect(page.getByText(/Sorry, we cannot answer that right now/).first()).toBeVisible()
  await expect(page.getByText('New — awaiting review')).toHaveCount(0)
})
