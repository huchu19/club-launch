import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, tabTo } from './helpers'

test('the cost calculator works with the keyboard alone', async ({ page }) => {
  await page.goto('/uk/clubs/linden-mayfair')

  const slider = page.getByRole('slider', { name: 'How often would you visit?' })
  await tabTo(page, slider, 150)
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('4')
  await expect(page.getByText('4 visits a week', { exact: true })).toBeVisible()
  // £245 a month over 4 × 52 / 12 visits.
  await expect(page.getByText('£14.13', { exact: true })).toBeVisible()

  // The next stops are the "What would you use?" checkboxes.
  await page.keyboard.press('Tab')
  const gym = page.getByRole('checkbox', { name: 'The gym' })
  await expect(gym).toBeFocused()
  await page.keyboard.press('Space')
  await expect(gym).not.toBeChecked()

  // Arrow keys move between membership plans.
  await tabTo(page, page.getByRole('radio', { name: /^Club £245/ }), 10)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: /Club and workspace/ })).toBeChecked()
  await expect(page.getByText('Club and workspace membership')).toBeVisible()

  await page.keyboard.press('Home')
  await expectNoA11yViolations(page)
})
