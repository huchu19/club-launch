import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { loadSharedPlan } from '@/lib/concierge/shared-plan'
import { site } from '@/lib/site'

export const alt = 'A planned first day at the club, stop by stop'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Design tokens as literals: the image renderer has no CSS variables.
const parchment = '#f8f1e5'
const ink = '#302923'
const muted = '#6f6257'
const line = '#ddd0bc'
const brand = '#1e5b43'

type Props = { params: Promise<{ market: string; slug: string; dayPlanId: string }> }

export default async function Image({ params }: Props) {
  const { market, slug, dayPlanId } = await params
  const [display, sans, shared] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/BricolageGrotesque-Medium.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Inter-Medium.ttf')),
    loadSharedPlan(market, slug, dayPlanId),
  ])
  const title = shared ? `A ${shared.day.day} at ${shared.day.clubName}` : site.name
  const stops = shared?.day.stops.slice(0, 4) ?? []

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: parchment,
        color: ink,
        padding: '64px 76px',
        fontFamily: 'Inter',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 26, color: brand }}>
        <div style={{ width: 48, height: 2, background: brand }} />A planned first day
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div
          style={{
            fontFamily: 'Bricolage',
            fontSize: 70,
            lineHeight: 1.04,
            letterSpacing: -2,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        {stops.length ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              borderLeft: `2px solid ${line}`,
              paddingLeft: 30,
            }}
          >
            {stops.map((stop) => (
              <div
                key={`${stop.time}-${stop.spaceId}`}
                style={{ display: 'flex', alignItems: 'baseline', gap: 26, fontSize: 30 }}
              >
                <span style={{ color: brand, width: 96 }}>{stop.time}</span>
                <span>{stop.activity}</span>
                <span style={{ color: muted, fontSize: 24 }}>{stop.spaceName}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: muted }}>
        <span>{site.name}</span>
        <span>Plan your own first day</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Bricolage', data: display, weight: 500, style: 'normal' },
        { name: 'Inter', data: sans, weight: 500, style: 'normal' },
      ],
    },
  )
}
