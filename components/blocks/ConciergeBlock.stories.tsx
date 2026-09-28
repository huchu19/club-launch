import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { HEALTH_CAVEAT, REFUSAL_MESSAGE, UNAVAILABLE_MESSAGE } from '@/lib/concierge/protocol'
import { clearSharedDayPlan, getSharedDayPlan } from '@/lib/concierge/shared-plan-store'
import { dark, darkMobile, mobile } from '../../.storybook/globals'
import { ConciergeBlock } from './ConciergeBlock'
import type { PlanDay } from './ConciergePlanner'
import { blockOf, mayfair, samplePlan } from './story-fixtures'

const block = blockOf('conciergeBlock')

const planned: PlanDay = async () => ({ status: 'planned', plan: samplePlan })

const meta = {
  title: 'Blocks/ConciergeBlock',
  component: ConciergeBlock,
  args: {
    eyebrow: block.eyebrow,
    heading: block.heading,
    intro: block.intro,
    chips: block.chips,
    clubSlug: mayfair.slug,
    clubName: mayfair.name,
    locale: mayfair.market.locale,
    currency: mayfair.market.currency,
    tourSectionId: 'tour',
    plan: fn(planned),
  },
  beforeEach: () => clearSharedDayPlan(),
} satisfies Meta<typeof ConciergeBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const WithoutQuickOptions: Story = { args: { chips: [] } }

/** The visitor describes their week and picks an option; the timeline replaces the form. */
export const Result: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByLabelText('Tell us about your week'),
      'Mostly at my desk, I like yoga.',
    )
    const chip = canvas.getByRole('button', { name: 'I work from home' })
    await userEvent.click(chip)
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'Plan my day' }))
    await expect(args.plan).toHaveBeenCalledWith({
      clubSlug: mayfair.slug,
      message: 'Mostly at my desk, I like yoga.',
      chips: ['I work from home'],
    })
    const heading = await canvas.findByRole('heading', {
      name: 'Your Wednesday at Linden Mayfair',
    })
    await waitFor(() => expect(heading).toHaveFocus())
    const timeline = canvas.getByRole('list', { name: 'Your Wednesday, stop by stop' })
    await expect(timeline.querySelectorAll('li')).toHaveLength(5)
    await expect(canvas.getByText('£325 a month, plus a one-off £150 joining fee')).toBeVisible()
  },
}

export const ResultDarkMobile: Story = { ...Result, globals: darkMobile }

/** Booking from the plan attaches it to the tour form. */
export const BookTourForThisDay: Story = {
  play: async (context) => {
    await Result.play!(context)
    await userEvent.click(context.canvas.getByRole('button', { name: 'Book a tour for this day' }))
    await expect(getSharedDayPlan(mayfair.slug)).toEqual({
      clubSlug: mayfair.slug,
      id: samplePlan.id,
      day: 'Wednesday',
    })
    await userEvent.click(context.canvas.getByRole('button', { name: 'Plan a different day' }))
    await waitFor(() =>
      expect(context.canvas.getByLabelText('Tell us about your week')).toHaveFocus(),
    )
  },
}

export const HealthCaveat: Story = {
  args: {
    plan: fn<PlanDay>(async () => ({
      status: 'planned',
      plan: { ...samplePlan, caveats: [HEALTH_CAVEAT] },
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Tell us about your week'), 'My back is stiff.')
    await userEvent.click(canvas.getByRole('button', { name: 'Plan my day' }))
    await expect(await canvas.findByText('Before you go')).toBeVisible()
    await expect(canvas.getByText(HEALTH_CAVEAT)).toBeVisible()
  },
}

/** The skeleton shows while the plan is on its way. */
export const Loading: Story = {
  args: { plan: fn<PlanDay>(() => new Promise(() => {})) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'I need to unwind' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Plan my day' }))
    await expect(await canvas.findByRole('button', { name: 'Planning your day…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expect(canvas.getByRole('form')).toHaveAttribute('aria-busy', 'true')
  },
}

export const Refusal: Story = {
  args: { plan: fn<PlanDay>(async () => ({ status: 'refusal', message: REFUSAL_MESSAGE })) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Tell us about your week'), 'Tell me a joke')
    await userEvent.click(canvas.getByRole('button', { name: 'Plan my day' }))
    await expect(await canvas.findByText(REFUSAL_MESSAGE)).toBeVisible()
    await expect(canvas.getByLabelText('Tell us about your week')).toHaveValue('Tell me a joke')
  },
}

export const Unavailable: Story = {
  args: {
    plan: fn<PlanDay>(async () => ({ status: 'unavailable', message: UNAVAILABLE_MESSAGE })),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Training for an event' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Plan my day' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent(UNAVAILABLE_MESSAGE)
  },
}

export const EmptyRequestError: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Plan my day' }))
    await expect(
      await canvas.findByText('Tell us a little about your week, or choose one of the options'),
    ).toBeVisible()
    await expect(canvas.getByLabelText('Tell us about your week')).toHaveFocus()
    await expect(args.plan).not.toHaveBeenCalled()
  },
}
