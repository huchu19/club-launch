import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { FALLBACK_ANSWER } from '@/lib/faq/protocol'
import { sessionKey } from '@/lib/faq/session-store'
import { dark, mobile } from '../../.storybook/globals'
import { FaqBlock } from './FaqBlock'
import { blockOf, mayfair, mayfairFaqs, streamingAnswer } from './story-fixtures'

const block = blockOf('faqBlock')

const NEW_ANSWER =
  'Yes. The thermal suite has a sauna, a steam room and a salt inhalation room, and it is included with every membership.'

const meta = {
  title: 'Blocks/FaqBlock',
  component: FaqBlock,
  args: {
    heading: block.heading,
    intro: block.intro,
    allowQuestions: true,
    faqs: mayfairFaqs,
    clubSlug: `${mayfair.slug}-story`,
    ask: fn(async () => streamingAnswer(NEW_ANSWER)),
  },
  // Session answers persist per tab; start every story clean.
  beforeEach: () => {
    window.sessionStorage.removeItem(sessionKey(`${mayfair.slug}-story`))
  },
} satisfies Meta<typeof FaqBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const ReadOnly: Story = { args: { allowQuestions: false } }
export const Empty: Story = { args: { faqs: [], allowQuestions: false } }

/** A new question streams in and joins the list with a pending label. */
export const AskNewQuestion: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('Anything else?'), 'Is there a steam room?')
    await userEvent.click(canvas.getByRole('button', { name: 'Ask' }))
    await expect(args.ask).toHaveBeenCalledWith({
      clubSlug: args.clubSlug,
      question: 'Is there a steam room?',
    })
    const badge = await canvas.findByText('New — awaiting review', {}, { timeout: 5000 })
    const item = badge.closest('details')!
    await expect(item).toHaveAttribute('open')
    // The new item fades in; wait for the animation to finish.
    await waitFor(() => expect(within(item).getByText(NEW_ANSWER)).toBeVisible())
    await expect(canvas.getByLabelText('Anything else?')).toHaveValue('')
  },
}

/** Quota errors and refusals come back as a polite fallback that is not added to the list. */
export const FallbackAnswer: Story = {
  args: { ask: fn(async () => streamingAnswer(FALLBACK_ANSWER, { status: 'fallback' })) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Anything else?'), 'What is the meaning of life?')
    await userEvent.click(canvas.getByRole('button', { name: 'Ask' }))
    await expect(await canvas.findByText(FALLBACK_ANSWER, {}, { timeout: 5000 })).toBeVisible()
    await expect(canvas.queryByText('New — awaiting review')).toBeNull()
  },
}

export const EmptyQuestionError: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Ask' }))
    await expect(await canvas.findByText('Enter your question')).toBeVisible()
    await expect(canvas.getByLabelText('Anything else?')).toHaveFocus()
    await expect(args.ask).not.toHaveBeenCalled()
  },
}
