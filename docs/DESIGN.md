# DESIGN — visual identity

## Platform name
Club Launch. The demo operator, "Linden", and its clubs are fictional.

## Origin
The identity is adapted from the author's portfolio, https://huchu.is-a.dev: its warm parchment
palette, fonts (Bricolage Grotesque for display, Inter for body), 8px spacing unit and easing are
reused, with a deep green `#1e5b43` as the brand colour.

- Supports light and dark modes (`color-scheme: light dark`)
- Editorial, calm tone

## Direction for this product
Calm, premium, editorial. Think a luxury wellness club brochure, not a gym ad.
- Generous whitespace, large restrained headings, few colours.
- The deep green is the brand colour: primary buttons, links, focus rings, small accents. Never large saturated fills behind body text.
- Warm off-white background in light mode; near-black green-tinted background in dark mode.
- Photography placeholders: soft, muted; use neutral generated placeholders or licensed stock with alt text.
- Motion: subtle fades and slides (200–300 ms), always disabled under `prefers-reduced-motion`.
- The "garden" metaphor fits recovery and spa sections (e.g. section eyebrow "The garden" for recovery). Use lightly, once or twice per page.

## Starting tokens
The tokens in use are defined in `app/globals.css` (Tailwind `@theme`), with every text and
background pair checked for WCAG AA. These were the starting values:
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

## Contrast
Measured WCAG contrast of the token pairs in use, light / dark:

| Pair | Light | Dark |
|---|---|---|
| Ink on canvas | 12.8 | 16.5 |
| Muted ink on canvas | 5.3 | 8.3 |
| Muted ink on raised surface | 4.7 | 7.1 |
| Brand on canvas | 7.1 | 7.4 |
| Text on brand | 8.0 | 7.4 |
| Input border on surface (non-text, needs 3:1) | 4.0 | 3.9 |

## Typography
Bricolage Grotesque for headings and Inter for body text, both loaded with `next/font/google` and
proper fallback stacks.

## Components (each with light, dark and mobile viewport stories)
Button, Link, Section, Eyebrow, Heading, Card, Accordion, FormField (input, textarea, select, checkbox), Toast/InlineMessage, plus the six blocks from SPEC §3.
