import * as THREE from 'three'
import { latLonToVector3 } from '../../data/olympics.js'
import { pointToMapPosition } from './markerLayout.js'

export const ROUTE_SURFACE = 2 * 1.002
const SEGMENTS = 32

// A quadratic bezier arc lifted off the surface, so the line reads as a
// "flight path" over the globe rather than following the terrain.
export function arcPoints(a, b, segments = SEGMENTS, liftScale = 1) {
  const angle = a.angleTo(b)
  const lift = 2 * (0.05 + 0.5 * (angle / Math.PI)) * liftScale
  const control = a.clone().add(b).normalize().multiplyScalar(2 + lift)

  const points = []
  const p = new THREE.Vector3()
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const it = 1 - t
    p.set(0, 0, 0)
      .addScaledVector(a, it * it)
      .addScaledVector(control, 2 * it * t)
      .addScaledVector(b, t * t)
    points.push(p.clone())
  }
  return points
}

/** Build all season/colour segments once for the torch and CityRoute. */
export function buildSeasonSegments(games = []) {
  const out = { summer: [], winter: [] }

  for (const season of ['summer', 'winter']) {
    const list = games.filter((g) => g.season === season)
    for (let i = 1; i < list.length; i += 1) {
      const from = list[i - 1]
      const to = list[i]
      const a = latLonToVector3(from.lat, from.lon, ROUTE_SURFACE)
      const b = latLonToVector3(to.lat, to.lon, ROUTE_SURFACE)
      const points = arcPoints(a, b)
      out[season].push({
        id: to.id,
        year: to.year,
        fromYear: from.year,
        from,
        to,
        points,
        mapPoints: points.map((point) => pointToMapPosition(point)),
      })
    }
  }

  return out
}

/**
 * The segment the time cursor is actually travelling through. This is what the
 * torch follows, so it starts moving immediately after the previous Games
 * instead of waiting for the nearest-Games midpoint.
 */
export function findTimelineSegment(segments, time) {
  if (!segments?.length) return null

  const next = segments.find((segment) => segment.fromYear <= time && time < segment.year)
  if (next) return next

  if (time >= segments[segments.length - 1].year) {
    return segments[segments.length - 1]
  }

  return null
}

export function segmentProgress(segment, time) {
  if (!segment) return 0
  const span = Math.max(1, segment.year - segment.fromYear)
  return Math.max(0, Math.min(1, (time - segment.fromYear) / span))
}

export function sampleSegment(segment, progress, outSphere, outMap) {
  const f = progress * (segment.points.length - 1)
  const i = Math.min(segment.points.length - 2, Math.floor(f))
  const t = f - i

  outSphere.copy(segment.points[i]).lerp(segment.points[i + 1], t)
  if (outMap) outMap.copy(segment.mapPoints[i]).lerp(segment.mapPoints[i + 1], t)
  return outSphere
}
