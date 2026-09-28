import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { facilitiesOf } from '@/lib/content/types'
import { dark, mobile } from '../../.storybook/globals'
import { FacilitiesBlock } from './FacilitiesBlock'
import { blockOf, mayfair } from './story-fixtures'

const block = blockOf('facilitiesBlock')

const meta = {
  title: 'Blocks/FacilitiesBlock',
  component: FacilitiesBlock,
  args: { heading: block.heading, intro: block.intro, facilities: facilitiesOf(mayfair) },
} satisfies Meta<typeof FacilitiesBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const Empty: Story = { args: { facilities: [] } }
export const LongText: Story = {
  args: {
    intro: undefined,
    facilities: [
      {
        name: 'An unusually long facility name that needs to wrap onto a second line',
        category: 'recovery',
        description: 'A long description. '.repeat(10),
      },
      { name: 'Pool', category: 'pool' },
    ],
  },
}
