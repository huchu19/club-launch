import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './helpers'

test('insights are behind admin auth', async ({ request }) => {
  expect((await request.get('/admin/insights')).status()).toBe(401)
})

test.describe('with admin credentials', () => {
  test.use({ httpCredentials: { username: 'admin', password: 'e2e-password' } })

  test('a manager sees grouped questions, what needs an answer and planner themes, fast', async ({
    page,
  }) => {
    // Warm up once, then time a normal load of the page on the seeded data.
    await page.goto('/admin/insights')
    const started = Date.now()
    await page.goto('/admin/insights')
    expect(Date.now() - started).toBeLessThan(1000)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'What visitors ask about Linden Mayfair',
    )
    // Near-duplicates are grouped under the most-asked one.
    const waiting = page.getByRole('region', { name: 'Waiting for an answer' })
    const steam = waiting.getByRole('row', { name: /Do you have a steam room/ })
    // Other tests share the demo store and may ask about the steam room too.
    await expect(steam).toContainText(/\d+ similar questions?/)
    const asked = Number(await steam.getByRole('cell').nth(1).textContent())
    expect(asked).toBeGreaterThanOrEqual(8)
    await expect(
      steam.getByRole('link', {
        name: /^Write an approved answer\s*: Do you have a steam room\?$/,
      }),
    ).toHaveAttribute('href', /\/studio\/intent\/edit\/id=faq-demo-steam;type=faqItem\/?$/)
    // A question the assistant couldn't answer is flagged.
    await expect(waiting.getByRole('row', { name: /How warm is the pool/ })).toContainText(
      'Couldn’t answer',
    )

    const planners = page.getByRole('region', { name: 'What first-day planners care about' })
    await expect(planners).toContainText('I work from home')
    await expect(planners).toContainText('Health (see a GP or physiotherapist)')
    await expectNoA11yViolations(page)
  })
})
