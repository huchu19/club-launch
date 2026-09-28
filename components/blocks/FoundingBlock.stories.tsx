import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { demoClubs, demoPages } from '@/lib/content/demo-data'
import type { FoundingBlockData } from '@/lib/content/types'
import { dark, darkMobile, mobile } from '../../.storybook/globals'
import { FoundingBlock } from './FoundingBlock'
import type { FetchPlacesLeft, SubmitFounding } from './FoundingSignup'

const marylebone = demoClubs[2]!
const block = demoPages
  .find((p) => p.clubId === marylebone._id)!
  .blocks.find((b): b is FoundingBlockData => b._type === 'foundingBlock')!

const meta = {
  title: 'Blocks/FoundingBlock',
  component: FoundingBlock,
  args: {
    eyebrow: block.eyebrow,
    heading: block.heading,
    offer: block.offer,
    pricePerMonth: block.pricePerMonth,
    joiningFee: block.joiningFee,
    totalPlaces: block.totalPlaces,
    clubSlug: marylebone.slug,
    clubName: marylebone.name,
    placesLeft: 37,
    tourHref: '#tour',
    submit: fn<SubmitFounding>(async () => ({
      ok: true,
      reference: 'FOUND-7F3K2Q',
      placesLeft: 36,
    })),
    // Stories keep the rendered count unless a story says otherwise.
    loadPlacesLeft: fn<FetchPlacesLeft>(async () => null),
  },
} satisfies Meta<typeof FoundingBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('37')).toBeVisible()
    await expect(canvas.getByText('of 150 founding places left')).toBeVisible()
    await expect(canvas.getByRole('meter', { name: 'Founding places taken' })).toHaveAttribute(
      'aria-valuenow',
      '113',
    )
    await expect(canvas.getByText('No joining fee for founding members')).toBeVisible()
  },
}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }

/** When the places have gone, the form closes and the page points to a preview tour. */
export const SoldOut: Story = {
  args: { placesLeft: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('All the founding places have gone')).toBeVisible()
    await expect(canvas.queryByRole('form')).toBeNull()
    await expect(canvas.getByRole('link', { name: 'booking a preview tour' })).toHaveAttribute(
      'href',
      '#tour',
    )
  },
}
export const SoldOutDarkMobile: Story = { ...SoldOut, globals: darkMobile }

async function fill(canvas: Parameters<NonNullable<Story['play']>>[0]['canvas']) {
  await userEvent.type(canvas.getByLabelText('Full name'), 'Sam Rivera')
  await userEvent.type(canvas.getByLabelText('Email address'), 'sam@example.com')
  await userEvent.click(canvas.getByRole('checkbox'))
}

export const Success: Story = {
  play: async ({ canvas, args }) => {
    await fill(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Hold my founding place' }))
    await expect(
      await canvas.findByText(/founding place at Linden Marylebone is held/),
    ).toBeVisible()
    await expect(canvas.getByText('FOUND-7F3K2Q')).toBeVisible()
    await expect(canvas.getByText('36')).toBeVisible()
    await expect(args.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        clubSlug: marylebone.slug,
        email: 'sam@example.com',
        consent: true,
      }),
    )
  },
}

/** Someone else took the last place first: the block switches to sold out. */
export const SellsOutWhileSigningUp: Story = {
  args: {
    placesLeft: 1,
    submit: fn<SubmitFounding>(async () => ({ ok: false, kind: 'sold-out', message: '' })),
  },
  play: async ({ canvas }) => {
    await fill(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Hold my founding place' }))
    await expect(await canvas.findByText('All the founding places have gone')).toBeVisible()
  },
}

export const ValidationErrors: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Hold my founding place' }))
    const summary = await canvas.findByRole('alert', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    await expect(canvas.getByRole('link', { name: 'Enter your name' })).toBeVisible()
    await expect(args.submit).not.toHaveBeenCalled()
  },
}

export const ServerErrorKeepsInput: Story = {
  args: {
    submit: fn<SubmitFounding>(async () => ({
      ok: false,
      kind: 'error',
      message:
        'We could not save your place just now. Your details are still here, so please try again in a moment.',
    })),
  },
  play: async ({ canvas }) => {
    await fill(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Hold my founding place' }))
    await expect(await canvas.findByText('Your place was not saved')).toBeVisible()
    await expect(canvas.getByLabelText('Full name')).toHaveValue('Sam Rivera')
  },
}

/** The static page's count is refreshed from the server once it loads. */
export const LiveCount: Story = {
  args: { loadPlacesLeft: fn<FetchPlacesLeft>(async () => 12) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('12')).toBeVisible()
  },
}
