import type { Decorator, Preview } from '@storybook/nextjs-vite'
import { Bricolage_Grotesque, Inter } from 'next/font/google'
import { useLayoutEffect, type ReactNode } from 'react'
import '../app/globals.css'

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz', 'wdth'],
  variable: '--font-bricolage',
})
const sans = Inter({ subsets: ['latin'], variable: '--font-inter' })

/** Applies the theme and font variables to <html>, as the app's root layout does. */
function ThemeRoot({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.lang = 'en-GB'
    root.classList.add(display.variable, sans.variable)
  }, [theme])
  return <div className="min-h-screen bg-canvas font-sans text-ink">{children}</div>
}

const withTheme: Decorator = (Story, context) => (
  <ThemeRoot theme={context.globals.theme === 'dark' ? 'dark' : 'light'}>
    <Story />
  </ThemeRoot>
)

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
    // Any serious or critical axe violation fails the story's test.
    a11y: { test: 'error' },
    controls: { expanded: true },
  },
}

export default preview
