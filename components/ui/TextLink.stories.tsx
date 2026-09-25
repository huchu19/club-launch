import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { TextLink } from './TextLink'

const meta = {
  title: 'UI/Link',
  component: TextLink,
  args: { href: '/uk/clubs/linden-mayfair', children: 'Visit Linden Mayfair' },
  decorators: [
    (Story) => (
      <p className="max-w-prose p-8">
        Read more or <Story /> to see the finished page.
      </p>
    ),
  ],
} satisfies Meta<typeof TextLink>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Muted: Story = { args: { muted: true } }
export const External: Story = {
  args: { href: 'https://example.com', children: 'an external site' },
}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
