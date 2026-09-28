import { describe, expect, it } from 'vitest'
import { claimPlace } from './places'
import { createSanityPlacesStore, placesDocumentId } from './sanity-store'

/** A fake Sanity client that enforces revisions like the real one (409 on a clash). */
function fakeClient() {
  const docs = new Map<string, { taken: number; _rev: string }>()
  let revisions = 0
  const conflict = () => Object.assign(new Error('Conflict'), { statusCode: 409 })
  const tick = () => new Promise<void>((r) => setTimeout(r, Math.random() * 3))
  return {
    docs,
    async getDocument<T>(id: string) {
      await tick()
      const doc = docs.get(id)
      return (doc ? { ...doc } : undefined) as T | undefined
    },
    async create(doc: Record<string, unknown>) {
      await tick()
      const id = doc._id as string
      if (docs.has(id)) throw conflict()
      docs.set(id, { taken: doc.taken as number, _rev: `r${++revisions}` })
    },
    patch(id: string) {
      return {
        ifRevisionId: (rev: string) => ({
          set: (attrs: Record<string, unknown>) => ({
            commit: async () => {
              await tick()
              const doc = docs.get(id)
              if (!doc || doc._rev !== rev) throw conflict()
              docs.set(id, { taken: attrs.taken as number, _rev: `r${++revisions}` })
            },
          }),
        }),
      }
    },
  }
}

describe('Sanity places store', () => {
  it('never oversells with parallel signups, including the very first ones', async () => {
    const client = fakeClient()
    const store = createSanityPlacesStore(client)
    const results = await Promise.all(
      Array.from({ length: 30 }, () => claimPlace(store, 'club-x', 8)),
    )
    expect(results.filter((r) => r.ok)).toHaveLength(8)
    expect(client.docs.get(placesDocumentId('club-x'))?.taken).toBe(8)
  })

  it('passes on errors that are not revision clashes', async () => {
    const client = fakeClient()
    client.create = async () => {
      throw Object.assign(new Error('Unauthorised'), { statusCode: 401 })
    }
    await expect(claimPlace(createSanityPlacesStore(client), 'club-x', 8)).rejects.toThrow(
      'Unauthorised',
    )
  })
})
