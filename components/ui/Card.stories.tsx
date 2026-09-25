import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { Card } from './Card'

const meta = {
  title: 'UI/Card',
  component: Card,
  args: {
    children: (
      <>
        <h3 className="text-2xl">Club</h3>
        <p className="mt-3 text-ink-muted">Gym, pool, classes and the thermal suite.</p>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Flat: Story = {}
export const Raised: Story = { args: { elevation: 'raised' } }
export const Dark: Story = { globals: dark, args: { elevation: 'raised' } }
export const Mobile: Story = { globals: mobile }
