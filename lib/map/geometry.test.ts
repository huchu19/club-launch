import { describe, expect, it } from 'vitest'
import { demoClubs } from '@/lib/content/demo-data'
import { geometryOf, labelPoint, parsePoints, place, readingOrder } from './geometry'

describe('floor plan geometry', () => {
  it('parses polygons and rejects malformed points', () => {
    expect(parsePoints('0,0 10,0 10,10')).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ])
    expect(parsePoints('0,0 10,0')).toBeNull()
    expect(parsePoints('0,0 10,x 10,10')).toBeNull()
  })

  it('drops rectangles with missing or zero size', () => {
    expect(geometryOf({ shape: 'rect', x: 0, y: 0, w: 10, h: 10 })).toEqual({
      kind: 'rect',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
    })
    expect(geometryOf({ shape: 'rect', x: 0, y: 0, w: 0, h: 10 })).toBeNull()
    expect(geometryOf({ shape: 'rect', x: 0, w: 10, h: 10 })).toBeNull()
    expect(geometryOf({ shape: 'polygon' })).toBeNull()
  })

  it('centres labels unless a position is given', () => {
    const rect = { shape: 'rect' as const, x: 0, y: 0, w: 100, h: 50 }
    expect(labelPoint(rect, geometryOf(rect)!)).toEqual({ x: 50, y: 25 })
    const lShape = { shape: 'polygon' as const, points: '0,0 100,0 100,100 50,100 50,50 0,50' }
    expect(labelPoint(lShape, geometryOf(lShape)!)).toEqual({ x: 50, y: 50 })
    expect(labelPoint({ ...lShape, labelX: 75, labelY: 80 }, geometryOf(lShape)!)).toEqual({
      x: 75,
      y: 80,
    })
  })

  it('orders zones top to bottom, then left to right, for arrow keys', () => {
    const ground = demoClubs[0]!.clubMap!.floors[0]!
    expect(readingOrder(place(ground.zones)).map((z) => z.spaceId)).toEqual([
      'garden-kitchen',
      'workspace',
      'strength-studio',
      'movement-studio',
    ])
  })

  it('every seeded zone points at a real space and has valid geometry', () => {
    const club = demoClubs[0]!
    const ids = new Set(club.spaces.map((s) => s.id))
    for (const floor of club.clubMap!.floors) {
      expect(place(floor.zones)).toHaveLength(floor.zones.length)
      for (const zone of floor.zones) expect(ids.has(zone.spaceId)).toBe(true)
    }
  })
})
