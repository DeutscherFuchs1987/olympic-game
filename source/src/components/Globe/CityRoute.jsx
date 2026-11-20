import { useEffect, useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { colorForSeason } from '../../data/olympics.js'
import {
  buildChronoSegments,
  buildSeasonSegments,
  findTimelineSegment,
} from './routeUtils.js'
import { splitAtSeam } from './markerLayout.js'

function appendPositions(positions, points) {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
  }
}

/**
 * All inactive historical routes are merged into two LineSegments meshes
 * (summer + winter). This keeps ~50 line draw calls down to 2. Flat routes are
 * split at the antimeridian so they never draw across the entire map.
 */
function MergedRoutes({ segments, flat, color, opacity }) {
  const geometry = useMemo(() => {
    const positions = []
    for (const segment of segments) {
      const points = flat ? segment.mapPoints : segment.points
      if (flat) {
        for (const part of splitAtSeam(points)) appendPositions(positions, part)
      } else {
        appendPositions(positions, points)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [segments, flat])

  useEffect(() => () => geometry.dispose(), [geometry])

  if (segments.length === 0) return null

  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  )
}

export default function CityRoute({
  games = [],
  selectedGame = null,
  revealYear = 2028,
  timelineTime = 2028,
  seasonFilter = 'all',
  flat = false,
  visible = true,
}) {
  const focused = !!selectedGame
  const seasonal = useMemo(() => buildSeasonSegments(games), [games])
  const chronological = useMemo(() => buildChronoSegments(games), [games])

  const segments = useMemo(
    () => (seasonFilter === 'all'
      ? chronological
      : seasonal[seasonFilter] ?? []),
    [seasonFilter, chronological, seasonal],
  )

  const seasonData = useMemo(() => {
    const buckets = new Map()

    const ensureBucket = (season) => {
      if (!buckets.has(season)) {
        buckets.set(season, {
          season,
          color: colorForSeason(season),
          active: null,
          upcoming: null,
          inactive: [],
        })
      }
      return buckets.get(season)
    }

    for (const segment of segments) {
      ensureBucket(segment.season ?? 'summer').inactive.push(segment)
    }

    const active = findTimelineSegment(segments, timelineTime)
    const candidate = active?.span === 0
      ? null
      : findTimelineSegment(segments, timelineTime + 0.02)
    const upcoming = candidate && candidate.id !== active?.id ? candidate : null

    for (const bucket of buckets.values()) {
      bucket.inactive = bucket.inactive.filter(
        (segment) => segment.year <= revealYear
          && segment.id !== active?.id
          && segment.id !== upcoming?.id,
      )
    }

    if (active) {
      ensureBucket(active.season ?? 'summer').active = active
    }
    if (upcoming) {
      ensureBucket(upcoming.season ?? 'summer').upcoming = upcoming
    }

    return [...buckets.values()]
  }, [segments, timelineTime, revealYear])

  if (!visible) return null

  return (
    <group>
      {seasonData.map(({ season, color, active, upcoming, inactive }) => (
        <group key={season}>
          <MergedRoutes
            segments={inactive}
            flat={flat}
            color={color}
            opacity={focused ? 0.05 : 0.2}
          />

          {active && (flat
            ? splitAtSeam(active.mapPoints).map((part, index) => (
              <Line
                key={`${active.id}-active-${index}`}
                points={part}
                color={color}
                lineWidth={2.6}
                transparent
                opacity={0.95}
                depthWrite={false}
                toneMapped={false}
              />
            ))
            : (
              <Line
                key={`${active.id}-active-sphere`}
                points={active.points}
                color={color}
                lineWidth={2.6}
                transparent
                opacity={0.95}
                depthWrite={false}
                toneMapped={false}
              />
            ))}

          {/* The next leg is visible while the time cursor is parked on a
              Games card, so the route does not appear from nowhere when the
              user continues. */}
          {upcoming && (flat
            ? splitAtSeam(upcoming.mapPoints).map((part, index) => (
              <Line
                key={`${upcoming.id}-upcoming-${index}`}
                points={part}
                color={color}
                lineWidth={2.2}
                transparent
                opacity={0.62}
                depthWrite={false}
                toneMapped={false}
              />
            ))
            : (
              <Line
                key={`${upcoming.id}-upcoming-sphere`}
                points={upcoming.points}
                color={color}
                lineWidth={2.2}
                transparent
                opacity={0.62}
                depthWrite={false}
                toneMapped={false}
              />
            ))}
        </group>
      ))}
    </group>
  )
}
