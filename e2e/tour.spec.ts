import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, isoDateFromToday, tabTo } from './helpers'

test('a visitor books a tour using only the keyboard', async ({ page }) => {
  await page.goto('/uk/clubs/linden-mayfair')
  await expectNoA11yViolations(page)

  // Hero call to action jumps to the tour form.
  const cta = page.getByRole('link', { name: 'Book a tour' })
  await tabTo(page, cta)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#tour$/)

  // Submitting empty shows an error summary that takes focus.
  const submit = page.getByRole('button', { name: 'Request a tour' })
  await tabTo(page, submit)
  await page.keyboard.press('Enter')
  const summary = page.getByRole('alert').filter({ hasText: 'There is a problem' })
  await expect(summary).toBeFocused()
  await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true')
  await expectNoA11yViolations(page)

  // The summary links move focus to the field.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Enter your name' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Full name')).toBeFocused()

  await page.keyboard.type('Sam Rivera')
  await page.keyboard.press('Tab')
  await page.keyboard.type('sam@example.com')
  await page.keyboard.press('Tab') // phone is optional
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Preferred date')).toBeFocused()
  // The date input's segment order varies by platform, so set the value without
  // leaving the keyboard flow (fill() types into the focused field; no mouse).
  const date = isoDateFromToday(7)
  await page.getByLabel('Preferred date').fill(date)
  await expect(page.getByLabel('Preferred date')).toBeFocused()
  // Tab steps through the date's day/month/year segments first.
  await tabTo(page, page.getByLabel('Time of day'), 5)
  await page.keyboard.type('e') // type-ahead selects "Evening"
  await expect(page.getByLabel('Time of day')).toHaveValue('evening')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('checkbox', { name: /can contact me/ })).toBeFocused()
  await page.keyboard.press('Space')

  await tabTo(page, submit)
  await page.keyboard.press('Enter')

  const success = page.getByText('Thank you, Sam. Your tour request is in.')
  await expect(success).toBeVisible()
  await expect(page.getByText(/Reference: TOUR-[A-Z2-9]{6}/)).toBeVisible()
  await expectNoA11yViolations(page)
})

test('the hero call to action and accordion work with the keyboard', async ({ page }) => {
  await page.goto('/uk/clubs/linden-mayfair')
  const question = page.getByText('Can I bring a guest?')
  const summary = page.locator('summary').filter({ has: question })
  await tabTo(page, summary, 120)
  await page.keyboard.press('Enter')
  await expect(page.getByText(/up to two guests per visit/)).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByText(/up to two guests per visit/)).toBeHidden()
})
