import type { Meta, StoryObj } from '@storybook/nextjs-vite'
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
