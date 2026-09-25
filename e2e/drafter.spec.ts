import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './helpers'

test.describe('with admin credentials', () => {
  test.use({ httpCredentials: { username: 'admin', password: 'e2e-password' } })

  test('an admin drafts the Moorgate page and sees the placeholders to replace', async ({
    page,
  }) => {
    await page.goto('/admin/draft')
    await expect(page.getByRole('heading', { level: 1, name: 'Draft a club page' })).toBeVisible()
    await expectNoA11yViolations(page)

    await page.getByLabel('Club').selectOption({ label: 'Linden Moorgate' })
    await page
      .getByLabel('Brief')
      .fill(
        'Announce the conversion from a standard gym. Lead with recovery and the reformer studio.',
      )
    await page.getByLabel('Tone').selectOption('premium')
    await page.getByRole('button', { name: 'Draft the page' }).click()

    await expect(
      page.getByText('Draft created for Linden Moorgate. Nothing has been published.'),
    ).toBeVisible()
    await expect(page.getByText('[[PRICE: founding monthly membership]]')).toBeVisible()
    await expect(page.getByText('[[DATE: opening date]]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open the draft in the studio' })).toHaveAttribute(
      'href',
      /^\/studio\/intent\/edit\/id=[^;]+;type=clubPage\/$/,
    )
    await expectNoA11yViolations(page)
  })
})

test('admin routes reject visitors without credentials', async ({ request }) => {
  const page = await request.get('/admin/draft')
  expect(page.status()).toBe(401)
  expect(page.headers()['www-authenticate']).toMatch(/^Basic/)
  const api = await request.post('/api/admin/draft', { data: {} })
  expect(api.status()).toBe(401)
})
