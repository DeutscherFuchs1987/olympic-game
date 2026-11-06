import * as THREE from 'three'
import { latLonToVector3 } from '../../data/olympics.js'

// Flat map dimensions. The values are shared by the Earth shader, markers,
// routes, borders and the medal constellation so every layer folds together.
export const MAP_RADIUS = 2
export const MAP_SCALE = 0.82
export const MAP_WIDTH = 2 * Math.PI * MAP_RADIUS * MAP_SCALE
export const MAP_HEIGHT = Math.PI * MAP_RADIUS * MAP_SCALE

/**
 * Exact positions for the flat billboard markers. Multiple Games in the same
 * city deliberately share one point; CityMarkers picks one representative so
 * London never drifts into the English Channel.
 */
export function buildMarkerPositions(cities, radius) {
  return cities.map((city) => latLonToVector3(city.lat, city.lon, radius))
}

/** Latitude/longitude -> position on the flat equirectangular map. */
export function latLonToMap(lat, lon, target = new THREE.Vector3()) {
  const u = (lon + 180) / 360
  const v = (lat + 90) / 180
  return target.set((u - 0.5) * MAP_WIDTH, (v - 0.5) * MAP_HEIGHT, 0)
}

/** Exact flat-map positions for the markers. */
export function buildMapMarkerPositions(cities) {
  return cities.map((city) => latLonToMap(city.lat, city.lon))
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
