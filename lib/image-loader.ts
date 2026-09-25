// Global next/image loader (next.config.ts `images.loaderFile`).
// Sanity images use Sanity's CDN transforms, so Vercel's image quota is never
// touched. Local placeholders are small static files served as-is.

type LoaderArgs = { src: string; width: number; quality?: number }

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  if (src.startsWith('https://cdn.sanity.io/')) {
    const url = new URL(src)
    url.searchParams.set('w', String(width))
    url.searchParams.set('q', String(quality ?? 75))
    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'max')
    return url.toString()
  }
  // Keep the width in the URL so next/image sees the loader honouring it.
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`
}
