import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'
import { DraftModeBanner } from '@/components/site/DraftModeBanner'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SkipLink } from '@/components/site/SkipLink'
import '../globals.css'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode()
  return (
    <>
      <SkipLink />
      {isDraftMode ? <DraftModeBanner /> : null}
      <SiteHeader />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      {isDraftMode ? <VisualEditing /> : null}
    </>
  )
}
