import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, tabTo } from './helpers'

const CLUB = '/uk/clubs/linden-mayfair'

test('the club map works with the keyboard, without layout shift, and feeds the planner', async ({
  page,
}) => {
  await page.goto(CLUB)
  const plan = page.getByRole('radiogroup', { name: /Spaces on the ground floor/ })
  const details = page.getByRole('region', { name: 'Space details' })
  // Page (not viewport) coordinates, so scrolling doesn't count as a shift.
  const layout = () =>
    Promise.all(
      [plan, details].map((el) =>
        el.evaluate((node) => {
          const r = node.getBoundingClientRect()
          return { top: r.top + window.scrollY, left: r.left, width: r.width, height: r.height }
        }),
      ),
    )
  const before = await layout()

  const kitchen = page.getByRole('radio', { name: 'Garden kitchen, Food and drink' })
  await tabTo(page, kitchen, 150)
  await page.keyboard.press('ArrowRight')
  const workspace = page.getByRole('radio', { name: "Members' workspace, Co-working" })
  await expect(workspace).toBeFocused()
  await expect(workspace).toHaveAttribute('aria-checked', 'true')
  await expect(details).toContainText("Members' workspace")

  // The panel's space is reserved, so selecting a zone moves nothing.
  const [planAfter, detailsAfter] = await layout()
  expect(planAfter).toEqual(before[0])
  expect(detailsAfter?.top).toBe(before[1]?.top)
  await expectNoA11yViolations(page)

  // Floors are tabs with arrow keys, before the list toggle and the plan.
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('tab', { name: 'Ground floor', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Lower ground floor' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.keyboard.press('ArrowLeft')

  // "Add to my day" starts the planner with that space.
  await page.getByRole('radio', { name: "Members' workspace, Co-working" }).click()
  await tabTo(page, page.getByRole('button', { name: 'Add to my day' }), 20)
  await page.keyboard.press('Enter')
  const message = page.getByLabel('Tell us about your week')
  await expect(message).toBeFocused()
  await expect(message).toHaveValue(/spend some time in the members' workspace/)
})

test('the list view gives the same content', async ({ page }) => {
  await page.goto(CLUB)
  await page.getByRole('button', { name: 'View as list' }).click()
  for (const name of ['Garden kitchen', 'Thermal suite', 'Contrast therapy', '20-metre pool']) {
    await expect(page.getByRole('heading', { level: 4, name })).toBeVisible()
  }
  await expectNoA11yViolations(page)
})

test('zones lift on hover, but not with reduced motion', async ({ page }) => {
  const kitchen = page.getByRole('radio', { name: 'Garden kitchen, Food and drink' })
  const transformOnHover = async () => {
    await page.goto(CLUB)
    await kitchen.hover()
    await page.waitForTimeout(350)
    // Tailwind's translate utilities set the CSS `translate` property.
    return kitchen.evaluate((el) => getComputedStyle(el).translate)
  }
  expect(await transformOnHover()).not.toBe('none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await transformOnHover()).toBe('none')
})

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('tapping a zone shows its details', async ({ page }) => {
    await page.goto(CLUB)
    await page.getByRole('tab', { name: 'Lower ground floor' }).tap()
    await page.getByRole('radio', { name: 'Thermal suite, Spa' }).tap()
    await expect(page.getByRole('region', { name: 'Space details' })).toContainText(
      'Sauna, steam room',
    )
  })
})
