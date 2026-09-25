import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { RatesBlock } from './RatesBlock'
import { blockOf } from './story-fixtures'

const block = blockOf('ratesBlock')

const meta = {
  title: 'Blocks/RatesBlock',
  component: RatesBlock,
  args: { ...block, locale: 'en-GB', currency: 'GBP' },
} satisfies Meta<typeof RatesBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const SinglePlan: Story = { args: { plans: block.plans.slice(0, 1), note: undefined } }

/** How an AI draft looks in preview before an editor replaces the placeholders. */
export const DraftPlaceholders: Story = {
  args: {
    plans: [
      {
        _key: 'a',
        name: 'Founding member',
        pricePerMonth: '[[PRICE: founding monthly membership]]',
        joiningFee: '[[PRICE: joining fee]]',
        inclusions: ['Strength floor and reformer studio', 'Infrared sauna and cold plunge'],
      },
      {
        _key: 'b',
        name: 'Club and workspace',
        pricePerMonth: '[[PRICE: workspace membership]]',
        inclusions: ['Everything in Founding member', "Members' workspace"],
      },
    ],
    note: 'Prices to be confirmed.',
  },
}
