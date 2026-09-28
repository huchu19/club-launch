import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { HEALTH_CAVEAT } from '@/lib/concierge/protocol'
import { dark, mobile } from '../../.storybook/globals'
import { DayPlanDetails } from './DayPlanDetails'
import { samplePlan } from './story-fixtures'

const meta = {
  title: 'Blocks/DayPlanDetails',
  component: DayPlanDetails,
  args: { day: samplePlan, listLabel: 'A Wednesday, stop by stop' },
  decorators: [
    (Story) => (
      <div className="max-w-xl space-y-8 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DayPlanDetails>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const list = canvas.getByRole('list', { name: 'A Wednesday, stop by stop' })
    await expect(list.querySelectorAll('li')).toHaveLength(5)
    await expect(canvas.getByText('£325 a month, plus a one-off £150 joining fee')).toBeVisible()
  },
}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const WithCaveat: Story = { args: { day: { ...samplePlan, caveats: [HEALTH_CAVEAT] } } }
export const WithoutSuggestedPlan: Story = {
  args: { day: { ...samplePlan, recommendedPlan: undefined } },
}
