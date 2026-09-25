# DESIGN — visual identity

## Working platform name
`{{PLATFORM_NAME}}` — Huchu to replace before M1 starts. Until then use "Club Launch".

## Source of truth
The identity comes from Huchu's portfolio, https://huchu.is-a.dev (repo: github.com/huchu19/portfolio).
If `../portfolio` exists locally, read its global CSS / Tailwind config and reuse its colour tokens, font families, spacing and radii exactly. Otherwise use the tokens below.

Known from the live site:
- Theme colour: deep green `#1e5b43`
- Supports light and dark modes (`color-scheme: light dark`)
- Editorial, calm tone; a studio → garden → sky narrative; Urdu calligraphy used as a quiet accent

## Direction for this product
Calm, premium, editorial. Think a luxury wellness club brochure, not a gym ad.
- Generous whitespace, large restrained headings, few colours.
- The deep green is the brand colour: primary buttons, links, focus rings, small accents. Never large saturated fills behind body text.
- Warm off-white background in light mode; near-black green-tinted background in dark mode.
- Photography placeholders: soft, muted; use neutral generated placeholders or licensed stock with alt text.
- Motion: subtle fades and slides (200–300 ms), always disabled under `prefers-reduced-motion`.
- The "garden" metaphor fits recovery and spa sections (e.g. section eyebrow "The garden" for recovery). Use lightly, once or twice per page.

## Tokens (fallback if the portfolio repo isn't available)
```css
:root {
  --color-brand: #1e5b43;
  --color-brand-contrast: #ffffff;
  --color-bg: #faf8f4;
  --color-surface: #ffffff;
  --color-text: #1a1f1c;
  --color-text-muted: #5b635f;
  --color-border: #e4e0d8;
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px;
  --space-section: clamp(4rem, 8vw, 8rem);
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-brand: #5fb38f;
    --color-brand-contrast: #0c1410;
    --color-bg: #0c1410;
    --color-surface: #131d18;
    --color-text: #eef2ef;
    --color-text-muted: #a3b0a9;
    --color-border: #24322b;
  }
}
```
Verify every text/background pair meets WCAG AA contrast (4.5:1 body, 3:1 large text and UI) and adjust the dark brand tint if needed.

## Typography
Reuse the portfolio's fonts if found. Fallback: a serif display face for headings (e.g. "Fraunces" via `next/font/google`) and a clean sans for body (e.g. "Inter"), with proper fallback stacks.

## Components needed (each with light and dark stories, plus a mobile viewport story)
Button, Link, Section, Eyebrow, Heading, Card, Accordion, FormField (input, textarea, select, checkbox), Toast/InlineMessage, plus the six blocks from SPEC §3.
