import * as THREE from 'three'
import { latLonToVector3 } from '../../data/olympics.js'
import { pointToMapPosition } from './markerLayout.js'

export const EARTH_RADIUS = 2
export const ROUTE_SURFACE = EARTH_RADIUS * 1.012
const SEGMENTS = 32
const MIN_ARC_LIFT = 0.03

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function safePerpendicular(vector) {
  const axis = new THREE.Vector3(0, 1, 0)
  if (Math.abs(vector.dot(axis)) > 0.92) axis.set(1, 0, 0)
  return new THREE.Vector3().crossVectors(vector, axis).normalize()
}

/**
 * A quadratic Bezier with a fixed control radius dives inside the sphere for
 * long routes (anything above roughly 90 degrees). Build the arc on the sphere
 * instead: slerp the direction and add an altitude that is always positive.
 */
export function arcPoints(a, b, segments = SEGMENTS, liftScale = 1) {
  const radius = (a.length() + b.length()) / 2 || ROUTE_SURFACE
  const va = a.clone().normalize()
  const vb = b.clone().normalize()
  const angle = Math.acos(clamp(va.dot(vb), -1, 1))
  const points = []

  if (angle < 1e-4) {
    for (let i = 0; i <= segments; i += 1) {
      points.push(a.clone().lerp(b, i / segments))
    }
    return points
  }

  const sin = Math.sin(angle)
  let axis = null

  // Near the antipodal point the slerp denominator goes to zero. Rotate around
  // the shortest axis instead, or around any stable perpendicular when the
  // points are exactly antipodal.
  if (sin < 1e-3) {
    axis = new THREE.Vector3().crossVectors(va, vb)
    if (axis.lengthSq() < 1e-8) axis = safePerpendicular(va)
    axis.normalize()
  }

  const lift = Math.max(0.6, liftScale)
  const arcHeight = (MIN_ARC_LIFT + 0.07 * (angle / Math.PI)) * lift
  const direction = new THREE.Vector3()

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments

    if (axis) {
      direction.copy(va).applyAxisAngle(axis, angle * t)
    } else {
      direction
        .copy(va)
        .multiplyScalar(Math.sin((1 - t) * angle) / sin)
        .addScaledVector(vb, Math.sin(t * angle) / sin)
    }

    const altitude = radius + arcHeight * Math.sin(Math.PI * t)
    // Clone: `direction` is reused by the next iteration.
    points.push(direction.clone().multiplyScalar(altitude))
  }

  return points
}

function makeSegment(from, to) {
  const a = latLonToVector3(from.lat, from.lon, ROUTE_SURFACE)
  const b = latLonToVector3(to.lat, to.lon, ROUTE_SURFACE)
  const points = arcPoints(a, b)
  return {
    id: to.id,
    year: to.year,
    fromYear: from.year,
    span: to.year - from.year,
    from,
    to,
    season: to.season,
    points,
    mapPoints: points.map((point) => pointToMapPosition(point)),
  }
}

/** Build all season/colour segments once for the torch and CityRoute. */
export function buildSeasonSegments(games = []) {
  const out = { summer: [], winter: [] }

  for (const season of ['summer', 'winter']) {
    const list = games.filter((game) => game.season === season)
    for (let i = 1; i < list.length; i += 1) {
      out[season].push(makeSegment(list[i - 1], list[i]))
    }
  }

  return out
}

/**
 * One chronological chain for the "all" view. Without this the torch switches
 * from the summer chain to the winter chain halfway between two Games, which
 * looks like a teleport across the planet.
 */
export function buildChronoSegments(games = []) {
  const sorted = [...games].sort(
    (a, b) => a.year - b.year || (a.season === 'winter' ? 1 : -1),
  )
  const out = []

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i - 1].id === sorted[i].id) continue
    out.push(makeSegment(sorted[i - 1], sorted[i]))
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

  let exact = null
  for (const segment of segments) {
    if (segment.span > 0 && segment.fromYear < time && time < segment.year) {
      return segment
    }
    if (Math.abs(segment.year - time) < 1e-6) exact = segment
  }

  if (exact) return exact

  const next = segments.find((segment) => segment.year > time)
  return next ?? segments[segments.length - 1]
}

export function segmentProgress(segment, time) {
  if (!segment) return 0
  const span = Math.max(1, segment.span ?? segment.year - segment.fromYear)
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
