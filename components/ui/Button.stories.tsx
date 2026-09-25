import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { dark, mobile } from '../../.storybook/globals'
import { Button, ButtonLink } from './Button'

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Book a tour', onClick: fn() },
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Book a tour' }))
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

export const Secondary: Story = { args: { variant: 'secondary', children: 'See membership' } }

export const Quiet: Story = { args: { variant: 'quiet', children: 'Read the full timetable' } }

export const Large: Story = { args: { size: 'lg' } }

export const Disabled: Story = { args: { disabled: true, children: 'Sending…' } }

export const AsLink: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ButtonLink href="#tour">Book a tour</ButtonLink>
      <ButtonLink href="#rates" variant="secondary">
        See membership
      </ButtonLink>
    </div>
  ),
}

export const AllVariantsDark: Story = {
  globals: dark,
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="quiet">Quiet</Button>
    </div>
  ),
}

export const LongLabelMobile: Story = {
  globals: mobile,
  args: { children: 'Request a tour of the thermal suite and garden kitchen' },
}
