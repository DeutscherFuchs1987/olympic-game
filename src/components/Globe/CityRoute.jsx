import { useEffect, useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { buildSeasonSegments, findTimelineSegment } from './routeUtils.js'

const SEASONS = [
  { season: 'summer', color: '#fcb131' },
  { season: 'winter', color: '#4aa3ff' },
]

/**
 * All inactive historical routes are merged into two LineSegments meshes
 * (summer + winter). This keeps ~50 line draw calls down to 2.
 */
function MergedRoutes({ segments, flat, color, opacity }) {
  const geometry = useMemo(() => {
    const positions = []
    for (const segment of segments) {
      const points = flat ? segment.mapPoints : segment.points
      for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1]
        const b = points[i]
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
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
  timelineYear = 2028,
  flat = false,
  visible = true,
}) {
  const focused = !!selectedGame
  const segments = useMemo(() => buildSeasonSegments(games), [games])

  const seasonData = useMemo(
    () => SEASONS.map(({ season, color }) => {
      const list = segments[season] ?? []
      const active = findTimelineSegment(list, timelineYear)
      const inactive = list.filter(
        (segment) => segment.year <= revealYear && segment.id !== active?.id,
      )
      return { season, color, active, inactive }
    }),
    [segments, timelineYear, revealYear],
  )

  if (!visible) return null

  return (
    <group>
      {seasonData.map(({ season, color, active, inactive }) => (
        <group key={season}>
          <MergedRoutes
            segments={inactive}
            flat={flat}
            color={color}
            opacity={focused ? 0.05 : 0.2}
          />

          {active && (
            <Line
              key={active.id + '-active' + (flat ? '-flat' : '')}
              points={flat ? active.mapPoints : active.points}
              color={color}
              lineWidth={2.6}
              transparent
              opacity={0.95}
              depthWrite={false}
              toneMapped={false}
            />
          )}
        </group>
      ))}
    </group>
  )
}
