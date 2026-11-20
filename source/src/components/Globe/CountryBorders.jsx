import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { latLonToVector3 } from '../../data/olympics.js'
import { findCountryFeature } from '../../data/countriesGeo.js'
import { pointToMapPosition } from './markerLayout.js'

const LINE_RADIUS = 2 * 1.008

function ringToSegments(ring, flat = false) {
  const segments = []
  let current = []
  let prevLon = null

  for (const [lon, lat] of ring) {
    // Natural Earth normally splits polygons at the antimeridian, but a stray
    // crossing would draw a line straight across the whole globe.
    if (prevLon != null && Math.abs(lon - prevLon) > 180) {
      if (current.length > 1) segments.push(current)
      current = []
    }
    const point = latLonToVector3(lat, lon, LINE_RADIUS)
    current.push(flat ? pointToMapPosition(point) : point)
    prevLon = lon
  }

  if (current.length > 1) segments.push(current)
  return segments
}

function borderSegments(feature, flat = false) {
  if (!feature?.geometry) return []
  const { type, coordinates } = feature.geometry
  const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : []

  const out = []
  for (const polygon of polygons) {
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) continue
      out.push(...ringToSegments(ring, flat))
    }
  }
  return out
}

/**
 * Draws the outline of the selected Games' host country on the globe or on the
 * flat map. Data is shared with the medal constellation via countriesGeo.
 */
export default function CountryBorders({
  features = null,
  countryCode = null,
  accent = '#fcb131',
  flat = false,
  visible = true,
}) {
  const rings = useMemo(() => {
    if (!features?.length || !countryCode) return []
    return borderSegments(findCountryFeature(features, countryCode), flat)
  }, [features, countryCode, flat])

  if (!visible || rings.length === 0) return null

  return (
    <group>
      {rings.map((points, i) => (
        <Line
          key={`glow-${countryCode}-${flat}-${i}`}
          points={points}
          color={accent}
          lineWidth={11}
          transparent
          opacity={0.22}
          depthWrite={false}
          toneMapped={false}
          renderOrder={1}
        />
      ))}
      {rings.map((points, i) => (
        <Line
          key={`line-${countryCode}-${flat}-${i}`}
          points={points}
          color={accent}
          lineWidth={2.8}
          transparent
          opacity={1}
          depthWrite={false}
          toneMapped={false}
          renderOrder={2}
        />
      ))}
    </group>
  )
}
