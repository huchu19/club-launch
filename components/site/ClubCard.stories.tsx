import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { demoImages } from '@/lib/content/demo-data'
import { dark, mobile } from '../../.storybook/globals'
import { ClubCard } from './ClubCard'

const meta = {
  title: 'Site/ClubCard',
  component: ClubCard,
  args: {
    club: {
      title: 'Linden Mayfair',
      clubName: 'Linden Mayfair',
      slug: 'linden-mayfair',
      market: 'uk',
      status: 'open',
      tier: 'social-wellness',
      locality: 'Mayfair, London',
      summary: 'Relaunched as a social wellness club: thermal suite, contrast therapy and a pool.',
      image: demoImages.heroArches,
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClubCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const ComingSoonWithoutImage: Story = {
  args: {
    club: {
      ...meta.args.club,
      status: 'coming-soon',
      image: undefined,
      clubName: 'Linden Moorgate',
    },
  },
}
export const Dark: Story = { globals: dark }
export const Mobile: Story = { globals: mobile }
