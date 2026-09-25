import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { Heading } from './Heading'

const meta = {
  title: 'UI/Heading',
  component: Heading,
  args: { level: 2, children: 'Everything under one roof' },
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Heading>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Scale: Story = {
  render: () => (
    <div className="space-y-8">
      <Heading level={1}>Display: a slower kind of club</Heading>
      <Heading level={2}>Extra large: everything under one roof</Heading>
      <Heading level={3}>Large: thermal suite</Heading>
      <Heading level={4}>Medium: opening hours</Heading>
    </div>
  ),
}

export const LongText: Story = {
  args: {
    level: 1,
    children:
      'A deliberately long heading that wraps across several lines to check balance and rhythm',
  },
}

export const Dark: Story = { globals: dark, render: Scale.render }
export const Mobile: Story = { globals: mobile, render: Scale.render }
