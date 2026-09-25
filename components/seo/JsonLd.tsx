import { serializeJsonLd } from '@/lib/seo/jsonld'

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Escaped by serializeJsonLd; the data is built from typed CMS fields.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
