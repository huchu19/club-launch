import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent } from 'storybook/test'
import { dark, mobile } from '../../.storybook/globals'
import { PendingBadge } from '../blocks/FaqQuestions'
import { Accordion } from './Accordion'

const items = [
  {
    id: 'parking',
    title: 'Is there parking at the club?',
    content: <p>There is no on-site parking. The nearest public car park is five minutes away.</p>,
  },
  {
    id: 'guests',
    title: 'Can I bring a guest?',
    content: <p>Yes. Members may bring up to two guests per visit after 10:00.</p>,
  },
  {
    id: 'towels',
    title: 'Do I need to bring a towel?',
    content: <p>No. Towels, robes and toiletries are provided.</p>,
  },
]

const meta = {
  title: 'UI/Accordion',
  component: Accordion,
  args: { items },
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const summary = canvas.getByText('Can I bring a guest?').closest('summary')!
    const details = summary.closest('details')!
    await expect(details.open).toBe(false)
    // Native <summary> is in the tab order; Enter/Space toggling is covered by Playwright.
    await userEvent.tab()
    await userEvent.tab()
    await expect(summary).toHaveFocus()
    await userEvent.click(summary)
    await expect(details.open).toBe(true)
  },
}

export const WithPendingItem: Story = {
  args: {
    items: [
      ...items,
      {
        id: 'new',
        title: 'Is the sauna mixed?',
        badge: <PendingBadge />,
        defaultOpen: true,
        animate: true,
        content: <p>Yes, the thermal suite is mixed and swimwear is required.</p>,
      },
    ],
  },
}

export const LongText: Story = {
  args: {
    items: [
      {
        id: 'long',
        title:
          'I am recovering from a knee injury and wondered whether the contrast therapy circuit and the pool would be suitable for me?',
        defaultOpen: true,
        content: (
          <p>
            We cannot give medical advice, but the team will happily show you the facilities on a
            tour so you can talk it through with your physiotherapist.{' '}
            {'A long answer. '.repeat(12)}
          </p>
        ),
      },
    ],
  },
}

export const Dark: Story = { globals: dark, args: WithPendingItem.args }
export const Mobile: Story = { globals: mobile, args: WithPendingItem.args }
