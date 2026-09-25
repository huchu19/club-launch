import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { dark, mobile } from '../../.storybook/globals'
import { DraftForm, type SubmitDraft } from './DraftForm'

const clubs = [{ _id: 'club-linden-moorgate', name: 'Linden Moorgate', slug: 'linden-moorgate' }]

const meta = {
  title: 'Admin/DraftForm',
  component: DraftForm,
  args: {
    clubs,
    submit: fn<SubmitDraft>(async () => ({
      ok: true,
      result: {
        draftId: 'drafts.abc',
        studioPath: '/studio/intent/edit/id=abc;type=clubPage/',
        clubName: 'Linden Moorgate',
        attempts: 1,
        flaggedNumbers: ['12'],
        placeholders: [
          {
            raw: '[[DATE: opening date]]',
            kind: 'DATE',
            label: 'opening date',
            path: 'blocks[0].subheading',
            location: 'Hero › Subheading',
          },
          {
            raw: '[[PRICE: founding monthly membership]]',
            kind: 'PRICE',
            label: 'founding monthly membership',
            path: 'blocks[3].plans[0].pricePerMonth',
            location: 'Rates › Plans 1 › Price per month',
          },
        ],
      },
    })),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DraftForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const NoClubsLeft: Story = { args: { clubs: [] } }

export const CreatesDraft: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByLabelText('Brief'),
      'Announce the conversion, lead with recovery and the reformer studio.',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Draft the page' }))
    await expect(args.submit).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: 'club-linden-moorgate', tone: 'calm' }),
    )
    await expect(await canvas.findByText(/Nothing has been published/)).toBeVisible()
    await expect(canvas.getByText('[[PRICE: founding monthly membership]]')).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'Open the draft in the studio' }),
    ).toHaveAttribute('href', '/studio/intent/edit/id=abc;type=clubPage/')
  },
}

export const ValidationError: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('Brief'), 'Too short')
    await userEvent.click(canvas.getByRole('button', { name: 'Draft the page' }))
    await expect(await canvas.findByText('Write a brief of at least 20 characters')).toBeVisible()
    await expect(canvas.getByLabelText('Brief')).toHaveFocus()
    await expect(args.submit).not.toHaveBeenCalled()
  },
}

export const GenerationFailed: Story = {
  args: {
    submit: fn<SubmitDraft>(async () => ({
      ok: false,
      error: 'The AI returned a page that did not pass validation twice, so nothing was saved.',
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByLabelText('Brief'),
      'Lead with the reformer studio and recovery.',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Draft the page' }))
    await expect(await canvas.findByText('The draft was not created')).toBeVisible()
    await expect(canvas.getByLabelText('Brief')).toHaveValue(
      'Lead with the reformer studio and recovery.',
    )
  },
}
