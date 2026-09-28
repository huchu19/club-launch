import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, tabTo } from './helpers'

test('the busyness forecast works with the keyboard and describes every chart', async ({
  page,
}) => {
  await page.goto('/uk/clubs/linden-mayfair')
  const section = page.locator('#busyness')
  const selected = section.getByRole('tab', { selected: true })
  await expect(selected).toContainText('Today')

  // Step to tomorrow with the arrow keys (never today, so the labels name the day).
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const todayName = (await selected.textContent())!.match(
    /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/,
  )![0]
  const tomorrow = days[(days.indexOf(todayName) + 1) % 7]!
  await tabTo(page, selected, 150)
  await page.keyboard.press('ArrowRight')
  const next = section.getByRole('tab', { name: new RegExp(tomorrow) })
  await expect(next).toBeFocused()
  await expect(next).toHaveAttribute('aria-selected', 'true')

  const figures = section.getByRole('figure')
  await expect(figures).toHaveCount(7)
  for (const figure of await figures.all()) {
    await expect(figure).toHaveAccessibleName(new RegExp(`(Best time|Closed) on ${tomorrow}`))
    await expect(figure.getByRole('table')).toHaveCount(1)
  }
  await expect(section.getByText(/Illustrative data/)).toBeVisible()
  await expectNoA11yViolations(page)
})
