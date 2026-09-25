import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { Eyebrow } from './Eyebrow'
import { Heading } from './Heading'
import { Section } from './Section'

const meta = {
  title: 'UI/Section',
  component: Section,
  args: {
    'aria-labelledby': 'section-heading',
    children: (
      <>
        <Eyebrow>The garden</Eyebrow>
        <Heading id="section-heading">Recovery, taken seriously</Heading>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          Sections set the vertical rhythm of a page with generous, fluid spacing.
        </p>
      </>
    ),
  },
} satisfies Meta<typeof Section>

export default meta
type Story = StoryObj<typeof meta>

export const Canvas: Story = {}
export const Raised: Story = { args: { tone: 'raised' } }
export const Dark: Story = { globals: dark, args: { tone: 'raised' } }
export const Mobile: Story = { globals: mobile }
