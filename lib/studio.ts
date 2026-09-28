/** Studio deep link that opens a document for editing (its draft, if it has one). */
export function studioEditPath(documentId: string, type = 'clubPage'): string {
  const publishedId = documentId.replace(/^drafts\./, '')
  return `/studio/intent/edit/id=${publishedId};type=${type}/`
}
