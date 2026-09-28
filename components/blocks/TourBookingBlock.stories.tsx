import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fireEvent, fn, userEvent, waitFor } from 'storybook/test'
import { clearSharedDayPlan, shareDayPlan } from '@/lib/concierge/shared-plan-store'
import { addDaysIso, todayIso } from '@/lib/tour/schema'
import { dark, mobile } from '../../.storybook/globals'
import { blockOf, tourClub } from './story-fixtures'
import { TourBookingBlock } from './TourBookingBlock'
import type { SubmitTour } from './TourForm'

const block = blockOf('tourBookingBlock')

const meta = {
  title: 'Blocks/TourBookingBlock',
  component: TourBookingBlock,
  args: {
    heading: block.heading,
    intro: block.intro,
    club: tourClub,
    submit: fn<SubmitTour>(async () => ({ ok: true, reference: 'TOUR-7F3K2Q' })),
  },
  beforeEach: () => clearSharedDayPlan(),
} satisfies Meta<typeof TourBookingBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const WithoutContactDetails: Story = {
  args: { club: { name: tourClub.name, slug: tourClub.slug } },
}

/** Submitting an empty form shows an error summary that receives focus. */
export const ValidationErrors: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Request a tour' }))
    const summary = await canvas.findByRole('alert', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    await expect(canvas.getByRole('link', { name: 'Enter your name' })).toBeVisible()
    await expect(canvas.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true')
    await expect(args.submit).not.toHaveBeenCalled()
  },
}

async function fillForm(canvas: Parameters<NonNullable<Story['play']>>[0]['canvas']) {
  await userEvent.type(canvas.getByLabelText('Full name'), 'Sam Rivera')
  await userEvent.type(canvas.getByLabelText('Email address'), 'sam@example.com')
  fireEvent.change(canvas.getByLabelText('Preferred date'), {
    target: { value: addDaysIso(todayIso(), 7) },
  })
  await userEvent.selectOptions(canvas.getByLabelText('Time of day'), 'morning')
  await userEvent.click(canvas.getByRole('checkbox'))
}

export const SuccessfulRequest: Story = {
  play: async ({ canvas, args }) => {
    await fillForm(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Request a tour' }))
    await expect(await canvas.findByText(/Your tour request is in/)).toBeVisible()
    await expect(canvas.getByText('TOUR-7F3K2Q')).toBeVisible()
    await expect(args.submit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sam Rivera', email: 'sam@example.com', consent: true }),
    )
  },
}

/** A server failure keeps everything the visitor typed. */
export const ServerErrorKeepsInput: Story = {
  args: {
    submit: fn<SubmitTour>(async () => ({
      ok: false,
      kind: 'error',
      message:
        'We could not reach the club just now. Your details are still here, so please try again in a moment.',
    })),
  },
  play: async ({ canvas }) => {
    await fillForm(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Request a tour' }))
    await expect(await canvas.findByText('Your request was not sent')).toBeVisible()
    await expect(canvas.getByLabelText('Full name')).toHaveValue('Sam Rivera')
    await expect(canvas.getByLabelText('Email address')).toHaveValue('sam@example.com')
  },
}

/** A first-day plan from the concierge block travels with the request. */
export const WithAttachedDayPlan: Story = {
  beforeEach: () => {
    shareDayPlan({ clubSlug: tourClub.slug, id: 'storyplan0000001', day: 'Wednesday' })
    return () => clearSharedDayPlan()
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('Your Wednesday plan is attached')).toBeVisible()
    await fillForm(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Request a tour' }))
    await expect(
      await canvas.findByText('Your Wednesday plan is attached, so your tour can follow it.'),
    ).toBeVisible()
    await expect(args.submit).toHaveBeenCalledWith(
      expect.objectContaining({ dayPlanId: 'storyplan0000001' }),
    )
  },
}

export const RemoveAttachedDayPlan: Story = {
  beforeEach: () => {
    shareDayPlan({ clubSlug: tourClub.slug, id: 'storyplan0000001', day: 'Wednesday' })
    return () => clearSharedDayPlan()
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove the plan' }))
    await waitFor(() => expect(canvas.queryByText('Your Wednesday plan is attached')).toBeNull())
  },
}
