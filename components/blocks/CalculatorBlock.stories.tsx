import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fireEvent, userEvent, within } from 'storybook/test'
import { pricedPlansOf } from '@/lib/content/rate-plans'
import { dark, darkMobile, mobile } from '../../.storybook/globals'
import { CalculatorBlock } from './CalculatorBlock'
import { blockOf, mayfair, mayfairPage } from './story-fixtures'

const block = blockOf('calculatorBlock')
const plans = pricedPlansOf(mayfairPage.blocks)

const meta = {
  title: 'Blocks/CalculatorBlock',
  component: CalculatorBlock,
  args: {
    eyebrow: block.eyebrow,
    heading: block.heading,
    intro: block.intro,
    comparisonLabel: block.comparisonLabel,
    clubName: mayfair.name,
    plans,
    comparisons: mayfair.market.comparisonItems,
    locale: mayfair.market.locale,
    currency: mayfair.market.currency,
  },
} satisfies Meta<typeof CalculatorBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    // 3 visits a week of the gym and classes on the Club plan.
    await expect(canvas.getByText('3 visits a week')).toBeVisible()
    await expect(canvas.getByText('£18.85')).toBeVisible()
    const table = canvas.getByRole('table', { name: /Monthly cost/ })
    await expect(within(table).getByText('Paying separately in total')).toBeInTheDocument()
  },
}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const DarkMobile: Story = { globals: darkMobile }

/**
 * The slider shows its value as text and to assistive tech. (Arrow-key use of
 * the native range input is covered by the Playwright test with real key presses.)
 */
export const SliderValue: Story = {
  play: async ({ canvas }) => {
    const slider = canvas.getByRole('slider', { name: 'How often would you visit?' })
    fireEvent.change(slider, { target: { value: '5' } })
    await expect(slider).toHaveAttribute('aria-valuetext', '5 visits a week')
    await expect(canvas.getByText('5 visits a week')).toBeVisible()
    fireEvent.change(slider, { target: { value: '1' } })
    await expect(canvas.getByText('1 visit a week')).toBeVisible()
  },
}

/** With no visits there is nothing to divide by, and the page says so. */
export const ZeroVisits: Story = {
  play: async ({ canvas }) => {
    fireEvent.change(canvas.getByRole('slider'), { target: { value: '0' } })
    await expect(canvas.getByText('0 visits a week')).toBeVisible()
    await expect(canvas.getByText('–')).toBeVisible()
    await expect(canvas.getByText('Choose how often you’d visit.')).toBeVisible()
  },
}

/** Choosing more things and another plan updates everything live. */
export const ChangeUsesAndPlan: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Co-working' }))
    await userEvent.click(canvas.getByRole('radio', { name: /Club and workspace/ }))
    await expect(canvas.getByText('Club and workspace membership')).toBeVisible()
    await expect(
      canvas.getByText(/Gym day pass, Boutique fitness class, Co-working day pass/),
    ).toBeVisible()
  },
}

export const SinglePlanNoComparisons: Story = {
  args: { plans: plans.slice(0, 1), comparisons: [] },
}

/** Without a priced plan (for example a draft with placeholders) the block renders nothing. */
export const NoPricedPlans: Story = { args: { plans: [] } }
