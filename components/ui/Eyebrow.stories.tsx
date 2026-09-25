import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { Eyebrow } from './Eyebrow'

const meta = {
  title: 'UI/Eyebrow',
  component: Eyebrow,
  args: { children: 'The garden' },
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Eyebrow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongText: Story = {
  args: { children: 'Mayfair · Newly relaunched as a social wellness club this autumn' },
}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile, args: LongText.args }
