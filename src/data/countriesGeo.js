import { useEffect, useState } from 'react'
import { adm0ForIoc } from './countries.js'

let featuresPromise = null

/** Lazily fetch the Natural Earth country polygons (cached for the session). */
export function loadCountryFeatures() {
  if (!featuresPromise) {
    featuresPromise = fetch('/data/countries-110m.geojson')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.features ?? [])
      .catch(() => [])
  }
  return featuresPromise
}

export function useCountryFeatures() {
  const [features, setFeatures] = useState(null)

  useEffect(() => {
    let alive = true
    loadCountryFeatures().then((list) => {
      if (alive) setFeatures(list)
    })
    return () => {
      alive = false
    }
  }, [])

  return features
}

export function findCountryFeature(features, code) {
  if (!features?.length || !code) return null
  const target = adm0ForIoc(code)
  return (
    features.find((feature) => {
      const p = feature.properties ?? {}
      return (
        p.a === target ||
        p.i === target ||
        p.ADM0_A3 === target ||
        p.ISO_A3 === target
      )
    }) ?? null
  )
}

/** A good label point for a country: Natural Earth's label anchor if present. */
export function countryLabelPoint(feature) {
  const p = feature?.properties
  if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
    return { lat: p.y, lon: p.x }
  }

  // Fallback: average of the largest ring's coordinates.
  const geometry = feature?.geometry
  if (!geometry) return null
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  let best = null
  for (const polygon of polygons ?? []) {
    const ring = polygon?.[0]
    if (!ring?.length) continue
    if (!best || ring.length > best.length) best = ring
  }
  if (!best?.length) return null

  let lon = 0
  let lat = 0
  for (const [x, y] of best) {
    lon += x
    lat += y
  }
  return { lat: lat / best.length, lon: lon / best.length }
}
