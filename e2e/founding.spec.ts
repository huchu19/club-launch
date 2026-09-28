import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, tabTo } from './helpers'

test('a visitor takes a founding place at a coming-soon club with the keyboard', async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `192.0.2.${120 + test.info().retry}` })
  await page.goto('/uk/clubs/linden-marylebone')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'A new club is coming to Marylebone',
  )

  const section = page.locator('#founding')
  const meter = section.getByRole('meter', { name: 'Founding places taken' })
  const before = Number(await meter.getAttribute('aria-valuenow'))
  await expect(section).toContainText('of 150 founding places left')
  await expectNoA11yViolations(page)

  await tabTo(page, section.getByLabel('Full name'), 60)
  await page.keyboard.type('Sam Rivera')
  await page.keyboard.press('Tab')
  await page.keyboard.type('sam@example.com')
  await page.keyboard.press('Tab') // phone is optional
  await page.keyboard.press('Tab')
  await expect(section.getByRole('checkbox')).toBeFocused()
  await page.keyboard.press('Space')
  await tabTo(page, section.getByRole('button', { name: 'Hold my founding place' }), 5)
  await page.keyboard.press('Enter')

  await expect(section.getByText(/founding place at Linden Marylebone is held/)).toBeVisible()
  await expect(section.getByText(/Reference: FOUND-[A-Z2-9]{6}/)).toBeVisible()
  await expect(meter).toHaveAttribute('aria-valuenow', String(before + 1))
  await expectNoA11yViolations(page)
})

test('the club index shows the coming-soon club', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Linden Marylebone/ })).toBeVisible()
})
