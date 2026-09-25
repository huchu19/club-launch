import Image from 'next/image'
import type { ImageData } from '@/lib/content/types'
import { cn } from '@/lib/cn'

export type ArchImageProps = {
  image?: ImageData
  /** next/image sizes attribute for the rendered width. */
  sizes: string
  /** Load immediately (above-the-fold hero). */
  eager?: boolean
  shape?: 'arch' | 'soft'
  aspect?: 'portrait' | 'landscape'
  className?: string
}

/**
 * Image in an arched frame with a short offset "cut paper" shadow. When the
 * image is missing, a decorative leaf fills the frame instead.
 */
export function ArchImage({
  image,
  sizes,
  eager,
  shape = 'arch',
  aspect = 'portrait',
  className,
}: ArchImageProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-brand-wash shadow-[10px_10px_0_var(--color-line)]',
        shape === 'arch' ? 'rounded-t-full rounded-b-md' : 'rounded-md',
        aspect === 'portrait' ? 'aspect-[4/5]' : 'aspect-[4/3]',
        className,
      )}
    >
      {image ? (
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          placeholder={image.lqip ? 'blur' : 'empty'}
          blurDataURL={image.lqip}
          className="object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 100 125"
          aria-hidden="true"
          className="absolute inset-0 size-full text-brand"
          preserveAspectRatio="xMidYMax slice"
        >
          <path
            d="M50 118c-22-16-24-46 0-76 24 30 22 60 0 76z"
            fill="currentColor"
            opacity="0.28"
          />
          <path
            d="M50 116V50"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      )}
    </div>
  )
}
