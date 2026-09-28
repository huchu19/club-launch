import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'
import { dark, darkMobile, mobile } from '../../.storybook/globals'
import { BusynessBlock } from './BusynessBlock'
import { blockOf, mayfair } from './story-fixtures'

const block = blockOf('busynessBlock')

const meta = {
  title: 'Blocks/BusynessBlock',
  component: BusynessBlock,
  args: {
    eyebrow: block.eyebrow,
    heading: block.heading,
    intro: block.intro,
    clubSlug: mayfair.slug,
    spaces: mayfair.spaces,
    openingHours: mayfair.openingHours,
    today: 'Wednesday',
  },
} satisfies Meta<typeof BusynessBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: /Wednesday/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // Every space has a chart with a best time and a data table.
    const gym = canvas.getByRole('figure', { name: /Strength studio/ })
    await expect(gym).toHaveTextContent(/Best time today: \d\d:00, usually quiet/)
    await expect(
      within(gym).getByRole('table', { name: /Strength studio, typical busyness today/ }),
    ).toBeInTheDocument()
    await expect(canvas.getByText(/Illustrative data/)).toBeVisible()
  },
}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
export const DarkMobile: Story = { globals: darkMobile }

/** Days are tabs: arrow keys move between them and the charts follow. */
export const SwitchDay: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('tab', { name: /Wednesday/ }).focus()
    await userEvent.keyboard('{End}')
    const sunday = canvas.getByRole('tab', { name: /Sunday/ })
    await expect(sunday).toHaveFocus()
    await expect(sunday).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('figure', { name: /Thermal suite/ })).toHaveTextContent(
      'Best time on Sunday',
    )
  },
}

export const NoSpaces: Story = { args: { spaces: [] } }
