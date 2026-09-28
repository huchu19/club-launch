import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, waitFor } from 'storybook/test'
import { dark, mobile } from '../../.storybook/globals'
import { HeroBlock } from './HeroBlock'
import { blockOf } from './story-fixtures'

const hero = blockOf('heroBlock')

const meta = {
  title: 'Blocks/HeroBlock',
  component: HeroBlock,
  args: { ...hero },
} satisfies Meta<typeof HeroBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const MissingImage: Story = { args: { image: undefined } }
export const LongText: Story = {
  args: {
    eyebrow: 'Moorgate · Converting from a standard gym into a social wellness club',
    heading:
      'A considerably longer headline that has to wrap across several lines without losing its calm',
    subheading:
      'Everything you loved about the old gym, plus a reformer studio, an infrared sauna, cold plunge pools and a mezzanine workspace. '.repeat(
        2,
      ),
  },
}
export const WithoutCallToAction: Story = { args: { primaryCta: undefined, eyebrow: undefined } }

// Time of day. Each period runs axe in light and dark, so the tint keeps AA contrast.
const inPeriod = (period: 'morning' | 'midday' | 'evening' | 'night', href: string) => ({
  args: { period, highlightHref: href },
})

export const Morning: Story = {
  ...inPeriod('morning', '#map'),
  play: async ({ canvas }) => {
    // The hero's content fades in.
    await waitFor(() => expect(canvas.getByText('Mayfair · Good morning')).toBeVisible())
    await expect(canvas.getByRole('link', { name: 'See this morning’s classes' })).toHaveAttribute(
      'href',
      '#map',
    )
  },
}
export const MorningDark: Story = { ...inPeriod('morning', '#map'), globals: dark }
export const Midday: Story = inPeriod('midday', '#plan-your-day')
export const MiddayDark: Story = { ...inPeriod('midday', '#plan-your-day'), globals: dark }
export const Evening: Story = {
  ...inPeriod('evening', '#recovery'),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText('Mayfair · This evening')).toBeVisible())
    await waitFor(() =>
      expect(canvas.getByRole('link', { name: 'Spa and recovery this evening' })).toBeVisible(),
    )
  },
}
export const EveningDark: Story = { ...inPeriod('evening', '#recovery'), globals: dark }
export const Night: Story = inPeriod('night', '#plan-your-day')
export const NightDark: Story = { ...inPeriod('night', '#plan-your-day'), globals: dark }
export const EveningMobile: Story = { ...inPeriod('evening', '#recovery'), globals: mobile }

/** Without a variant for the period, the default wording shows. */
export const PeriodWithoutVariant: Story = {
  args: { period: 'evening', periodVariants: [] },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText(hero.eyebrow!)).toBeVisible())
  },
}
