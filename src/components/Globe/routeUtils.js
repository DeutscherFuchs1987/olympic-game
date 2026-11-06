import * as THREE from 'three'
import { latLonToVector3 } from '../../data/olympics.js'

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

export function gameArc(from, to) {
  const a = latLonToVector3(from.lat, from.lon, ROUTE_SURFACE)
  const b = latLonToVector3(to.lat, to.lon, ROUTE_SURFACE)
  return arcPoints(a, b)
}
