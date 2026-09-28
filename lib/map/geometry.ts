import type { MapFeature, MapZone } from '@/lib/content/types'

// Floor-plan geometry from CMS data. Anything malformed is dropped rather than
// drawn wrongly, so an editor's half-finished zone can't break the map.

type Shape = Pick<MapZone, 'shape' | 'x' | 'y' | 'w' | 'h' | 'points' | 'labelX' | 'labelY'>

export type Geometry =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'polygon'; points: Array<[number, number]> }

export function parsePoints(points: string): Array<[number, number]> | null {
  const pairs = points
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
  const valid = pairs.every((p) => p.length === 2 && p.every(Number.isFinite))
  return valid && pairs.length >= 3 ? (pairs as Array<[number, number]>) : null
}

export function geometryOf(shape: Shape): Geometry | null {
  if (shape.shape === 'rect') {
    const { x, y, w, h } = shape
    return x !== undefined && y !== undefined && w && h && w > 0 && h > 0
      ? { kind: 'rect', x, y, w, h }
      : null
  }
  const points = shape.points ? parsePoints(shape.points) : null
  return points ? { kind: 'polygon', points } : null
}

/** The label position: explicit if set, otherwise the centre of the bounding box. */
export function labelPoint(shape: Shape, geometry: Geometry): { x: number; y: number } {
  if (shape.labelX !== undefined && shape.labelY !== undefined) {
    return { x: shape.labelX, y: shape.labelY }
  }
  if (geometry.kind === 'rect') {
    return { x: geometry.x + geometry.w / 2, y: geometry.y + geometry.h / 2 }
  }
  const xs = geometry.points.map(([x]) => x)
  const ys = geometry.points.map(([, y]) => y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

export type PlacedZone = MapZone & { geometry: Geometry; label: { x: number; y: number } }
export type PlacedFeature = MapFeature & { geometry: Geometry; label: { x: number; y: number } }

export function place<T extends Shape>(items: T[]) {
  return items.flatMap((item) => {
    const geometry = geometryOf(item)
    return geometry ? [{ ...item, geometry, label: labelPoint(item, geometry) }] : []
  })
}

/**
 * Arrow-key order: top to bottom, then left to right, by label position.
 * Labels within `rowTolerance` units vertically count as the same row.
 */
export function readingOrder<T extends { label: { x: number; y: number } }>(
  zones: T[],
  rowTolerance = 60,
): T[] {
  return [...zones].sort((a, b) =>
    Math.abs(a.label.y - b.label.y) <= rowTolerance ? a.label.x - b.label.x : a.label.y - b.label.y,
  )
}
