import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { onConciergePrefill } from '@/lib/concierge/prefill'
import { dark, darkMobile, mobile } from '../../.storybook/globals'
import { ClubMapBlock } from './ClubMapBlock'
import { blockOf, mayfair } from './story-fixtures'

const block = blockOf('clubMapBlock')
// Wednesday 1 July 2026, 07:20 in London: Morning mobility is on in the studio.
const wednesdayMorning = new Date('2026-07-01T06:20:00Z')

const meta = {
  title: 'Blocks/ClubMapBlock',
  component: ClubMapBlock,
  args: {
    eyebrow: block.eyebrow,
    heading: block.heading,
    intro: block.intro,
    club: mayfair,
    plannerSectionId: 'plan-your-day',
    now: wednesdayMorning,
  },
} satisfies Meta<typeof ClubMapBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }

/** Choosing a zone shows what it is for and what is on there now. */
export const SelectSpace: Story = {
  play: async ({ canvas }) => {
    const studio = canvas.getByRole('radio', { name: 'Movement studio, Studio' })
    await userEvent.click(studio)
    await expect(studio).toHaveAttribute('aria-checked', 'true')
    const details = canvas.getByRole('region', { name: 'Space details' })
    await expect(details).toHaveTextContent('Morning mobility, until 07:45')
    await expect(details).toHaveTextContent('Vinyasa yoga, today at 08:00')
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Movement studio. Open now. Morning mobility is on until 07:45.',
    )
  },
}

export const SelectSpaceDarkMobile: Story = { ...SelectSpace, globals: darkMobile }

/** Arrow keys move between zones in reading order; Tab leaves the plan. */
export const KeyboardNavigation: Story = {
  play: async ({ canvas }) => {
    const kitchen = canvas.getByRole('radio', { name: 'Garden kitchen, Food and drink' })
    await expect(kitchen).toHaveAttribute('tabindex', '0')
    kitchen.focus()
    await userEvent.keyboard('{ArrowRight}')
    const workspace = canvas.getByRole('radio', { name: "Members' workspace, Co-working" })
    await expect(workspace).toHaveFocus()
    await expect(workspace).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{End}')
    await expect(canvas.getByRole('radio', { name: 'Movement studio, Studio' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(kitchen).toHaveFocus()
  },
}

/** Floors are tabs; arrow keys switch between them. */
export const SwitchFloor: Story = {
  play: async ({ canvas }) => {
    const ground = canvas.getByRole('tab', { name: 'Ground floor' })
    ground.focus()
    await userEvent.keyboard('{ArrowRight}')
    const lower = canvas.getByRole('tab', { name: 'Lower ground floor' })
    await expect(lower).toHaveFocus()
    await expect(lower).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('radio', { name: 'Thermal suite, Spa' })).toBeVisible()
  },
}

/** The list view has the same content as the map, for every floor. */
export const ListView: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'View as list' }))
    await expect(canvas.getByRole('button', { name: 'View as map' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(canvas.getByRole('heading', { name: 'Lower ground floor' })).toBeVisible()
    await expect(canvas.getAllByRole('heading', { level: 4 })).toHaveLength(7)
    await expect(canvas.getByText('Morning mobility, until 07:45')).toBeVisible()
  },
}

/** "Add to my day" hands the space to the first-day planner. */
export const AddToMyDay: Story = {
  play: async ({ canvas }) => {
    const received = fn()
    const stop = onConciergePrefill(received)
    await userEvent.click(canvas.getByRole('radio', { name: 'Garden kitchen, Food and drink' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Add to my day' }))
    await waitFor(() =>
      expect(received).toHaveBeenCalledWith('I’d like to spend some time in the garden kitchen.'),
    )
    stop()
  },
}

/** Late on Sunday nothing is on, and the next class is on Monday. */
export const ClosedLateSunday: Story = {
  args: { now: new Date('2026-07-05T21:30:00Z') },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Movement studio, Studio' }))
    const details = canvas.getByRole('region', { name: 'Space details' })
    await expect(details).toHaveTextContent('closed now')
    await expect(details).toHaveTextContent('Monday at 07:15')
  },
}

/** A club without a floor plan shows nothing. */
export const NoFloorPlan: Story = { args: { club: { ...mayfair, clubMap: undefined } } }
