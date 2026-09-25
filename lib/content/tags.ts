// Cache tags for published Sanity reads, and the tags a webhook for a changed
// document should expire. Tagged by document type, plus slug where one exists.

export const TYPE_TAGS = ['clubPage', 'club', 'faqItem', 'market'] as const

export function clubPageTags(slug: string): string[] {
  return [...TYPE_TAGS, `club:${slug}`]
}

export type WebhookDocument = { _type: string; slug?: string | null; clubSlug?: string | null }

export function tagsForDocument(doc: WebhookDocument): string[] {
  const tags = new Set<string>([doc._type])
  const slug = doc.slug ?? doc.clubSlug
  if (slug) tags.add(`club:${slug}`)
  return [...tags]
}
