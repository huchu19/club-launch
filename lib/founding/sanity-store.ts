import type { PlacesStore } from './places'

// The places counter as a Sanity document per club. Sanity's revision check
// (ifRevisionId) makes each write conditional; creating the first counter uses
// create, which fails if another request created it first.

type Client = {
  getDocument<T>(id: string): Promise<T | undefined>
  create(doc: Record<string, unknown>): Promise<unknown>
  patch(id: string): {
    ifRevisionId(rev: string): {
      set(attrs: Record<string, unknown>): { commit(): Promise<unknown> }
    }
  }
}

export const placesDocumentId = (key: string) => `foundingPlaces-${key}`

const isConflict = (error: unknown) => {
  const status = (error as { statusCode?: number }).statusCode
  return status === 409 || status === 412
}

export function createSanityPlacesStore(client: Client): PlacesStore {
  return {
    async read(key) {
      const doc = await client.getDocument<{ taken?: number; _rev: string }>(placesDocumentId(key))
      return doc ? { taken: doc.taken ?? 0, revision: doc._rev } : { taken: 0, revision: null }
    },
    async compareAndSet(key, expected, taken) {
      try {
        if (expected === null) {
          await client.create({
            _id: placesDocumentId(key),
            _type: 'foundingPlaces',
            clubKey: key,
            taken,
          })
        } else {
          await client.patch(placesDocumentId(key)).ifRevisionId(expected).set({ taken }).commit()
        }
        return true
      } catch (error) {
        if (isConflict(error)) return false
        throw error
      }
    },
  }
}
