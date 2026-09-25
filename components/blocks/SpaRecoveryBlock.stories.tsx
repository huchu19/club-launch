import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { SpaRecoveryBlock } from './SpaRecoveryBlock'
import { blockOf } from './story-fixtures'

const block = blockOf('spaRecoveryBlock')

const meta = {
  title: 'Blocks/SpaRecoveryBlock',
  component: SpaRecoveryBlock,
  args: { ...block },
} satisfies Meta<typeof SpaRecoveryBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const MissingImages: Story = {
  args: { items: block.items.map((item) => ({ ...item, image: undefined })) },
}
export const TwoItems: Story = { args: { items: block.items.slice(0, 2), eyebrow: undefined } }
