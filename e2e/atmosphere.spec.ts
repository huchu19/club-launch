import { expect, test } from '@playwright/test'

test('the time-of-day hero renders on the server with no hydration warnings', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' || /hydrat|did not match/i.test(text)) problems.push(text)
  })
  page.on('pageerror', (error) => problems.push(error.message))

  await page.goto('/uk/clubs/linden-mayfair')
  const hero = page.locator('section[data-period]').first()
  const period = await hero.getAttribute('data-period')
  expect(['morning', 'midday', 'evening', 'night']).toContain(period)

  // The period's highlight points at a section that exists on the page.
  const highlight = hero.getByRole('link').last()
  const target = (await highlight.getAttribute('href'))?.slice(1)
  expect(target).toBeTruthy()
  await expect(page.locator(`#${target}`)).toHaveCount(1)

  // Give React time to hydrate and report anything it disagrees with.
  await page.waitForLoadState('networkidle')
  expect(problems).toEqual([])
})
