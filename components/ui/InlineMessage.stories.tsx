import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { InlineMessage } from './InlineMessage'

const meta = {
  title: 'UI/InlineMessage',
  component: InlineMessage,
  args: {
    title: 'Thank you, Sam. Your tour request is in.',
    children: 'The team will email you to confirm your visit.',
    tone: 'success',
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InlineMessage>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {}
export const Info: Story = {
  args: { tone: 'info', title: undefined, children: 'Sorry, we cannot answer that right now.' },
}
export const ErrorTone: Story = {
  args: {
    tone: 'error',
    title: 'Your request was not sent',
    children: 'Your details are still here, so please try again in a moment.',
  },
}
export const AllTonesDark: Story = {
  globals: dark,
  render: () => (
    <div className="space-y-4">
      <InlineMessage tone="info" live="off">
        Information
      </InlineMessage>
      <InlineMessage tone="success" live="off" title="Success">
        It worked.
      </InlineMessage>
      <InlineMessage tone="error" live="off" title="Error">
        Something went wrong.
      </InlineMessage>
    </div>
  ),
}
export const Mobile: Story = { globals: mobile, args: ErrorTone.args }
