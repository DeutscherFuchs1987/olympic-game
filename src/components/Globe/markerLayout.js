import * as THREE from 'three'
import { latLonToVector3 } from '../../data/olympics.js'

// Games that took place in the same city land on the exact same lat/lon and
// would otherwise hide each other completely. Spread only near-identical
// points (Paris 1900/1924/2024, London 1908/1948/2012, ...) into a tiny rosette.
const MERGE_DISTANCE = 0.012
const UP = new THREE.Vector3(0, 1, 0)

// Flat map dimensions. The values are shared by the Earth shader, markers,
// routes, borders and the medal constellation so every layer folds together.
export const MAP_RADIUS = 2
export const MAP_SCALE = 0.82
export const MAP_WIDTH = 2 * Math.PI * MAP_RADIUS * MAP_SCALE
export const MAP_HEIGHT = Math.PI * MAP_RADIUS * MAP_SCALE

function clusterIndices(anchors) {
  const groups = []
  const used = new Array(anchors.length).fill(false)

  for (let i = 0; i < anchors.length; i += 1) {
    if (used[i]) continue
    used[i] = true
    const group = [i]

    for (let j = i + 1; j < anchors.length; j += 1) {
      if (!used[j] && anchors[i].distanceTo(anchors[j]) < MERGE_DISTANCE) {
        used[j] = true
        group.push(j)
      }
    }
    groups.push(group)
  }

  return groups
}

/**
 * Positions for the flat billboard markers. Coordinates stay on the sphere;
 * only overlapping markers receive a small tangential offset.
 */
export function buildMarkerPositions(cities, radius) {
  const anchors = cities.map((city) => latLonToVector3(city.lat, city.lon, radius))
  const positions = anchors.map((p) => p.clone())
  const groups = clusterIndices(anchors)

  for (const group of groups) {
    if (group.length < 2) continue

    const center = new THREE.Vector3()
    for (const index of group) center.add(anchors[index])
    center.normalize().multiplyScalar(radius)

    const normal = center.clone().normalize()
    const east = new THREE.Vector3().crossVectors(UP, normal)
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0)
    east.normalize()
    const north = new THREE.Vector3().crossVectors(normal, east).normalize()

    const spread = Math.min(0.08, 0.03 + group.length * 0.007)
    group.forEach((index, order) => {
      const angle = (Math.PI * 2 * order) / group.length - Math.PI / 2
      const p = center
        .clone()
        .addScaledVector(east, Math.cos(angle) * spread)
        .addScaledVector(north, Math.sin(angle) * spread)
      positions[index].copy(p.normalize().multiplyScalar(radius))
    })
  }

  return positions
}

/**
 * True when a point on the globe faces the camera. Used to ignore markers
 * hidden behind the Earth (raycasting alone sees straight through it).
 */
export function isFrontFacing(worldPoint, camera) {
  const normal = worldPoint.clone().normalize()
  const toCamera = camera.position.clone().sub(worldPoint)
  if (toCamera.lengthSq() < 1e-8) return true
  return normal.dot(toCamera.normalize()) > 0.02
}

/** Latitude/longitude -> position on the flat equirectangular map. */
export function latLonToMap(lat, lon, target = new THREE.Vector3()) {
  const u = (lon + 180) / 360
  const v = (lat + 90) / 180
  return target.set((u - 0.5) * MAP_WIDTH, (v - 0.5) * MAP_HEIGHT, 0)
}

/** Any point on/near the globe -> the matching point on the flat map. */
export function pointToMapPosition(point, target = new THREE.Vector3()) {
  const dir = point.clone().normalize()
  const lat = Math.asin(Math.max(-1, Math.min(1, dir.y)))
  const theta = Math.atan2(dir.z, -dir.x)
  let u = theta / (Math.PI * 2)
  u = ((u % 1) + 1) % 1
  const v = (lat + Math.PI / 2) / Math.PI
  return target.set((u - 0.5) * MAP_WIDTH, (v - 0.5) * MAP_HEIGHT, 0)
}

/** Same cluster spread as the globe, but in flat map coordinates. */
export function buildMapMarkerPositions(cities) {
  const anchors = cities.map((city) => latLonToMap(city.lat, city.lon))
  const positions = anchors.map((p) => p.clone())

  for (const group of clusterIndices(anchors)) {
    if (group.length < 2) continue

    const center = new THREE.Vector3()
    for (const index of group) center.add(anchors[index])
    center.divideScalar(group.length)

    const spread = Math.min(0.18, 0.06 + group.length * 0.02)
    group.forEach((index, order) => {
      const angle = (Math.PI * 2 * order) / group.length - Math.PI / 2
      positions[index].set(
        center.x + Math.cos(angle) * spread,
        center.y + Math.sin(angle) * spread,
        0,
      )
    })
  }

  return positions
}
