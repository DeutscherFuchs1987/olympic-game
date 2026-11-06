import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { pointToMapPosition } from './markerLayout.js'
import { arcPoints, ROUTE_SURFACE } from './routeUtils.js'
import { latLonToVector3 } from '../../data/olympics.js'

const ROUTES = [
  { season: 'summer', color: '#fcb131' },
  { season: 'winter', color: '#4aa3ff' },
]

export default function CityRoute({
  games = [],
  activeGame = null,
  selectedGame = null,
  revealYear = 2028,
  flat = false,
  visible = true,
}) {
  const focused = !!selectedGame

  const routes = useMemo(() => {
    const out = []
    for (const route of ROUTES) {
      const list = games.filter((g) => g.season === route.season)
      const segments = []
      for (let i = 1; i < list.length; i += 1) {
        const a = latLonToVector3(list[i - 1].lat, list[i - 1].lon, ROUTE_SURFACE)
        const b = latLonToVector3(list[i].lat, list[i].lon, ROUTE_SURFACE)
        const points = arcPoints(a, b)
        segments.push({
          id: list[i].id,
          year: list[i].year,
          points,
          mapPoints: points.map((p) => pointToMapPosition(p)),
        })
      }
      out.push({ ...route, segments })
    }
    return out
  }, [games])

  if (!visible) return null

  return (
    <group>
      {routes.map((route) => (
        <group key={route.season}>
          {route.segments
            .filter((seg) => seg.year <= revealYear || seg.id === activeGame?.id)
            .map((seg) => (
              <Line
                key={seg.id + (flat ? '-flat' : '')}
                points={flat ? seg.mapPoints : seg.points}
                color={route.color}
                lineWidth={1}
                transparent
                opacity={focused ? 0.05 : 0.2}
                depthWrite={false}
                toneMapped={false}
              />
            ))}

          {route.segments
            .filter((seg) => seg.id === activeGame?.id)
            .map((seg) => (
              <Line
                key={seg.id + '-active' + (flat ? '-flat' : '')}
                points={flat ? seg.mapPoints : seg.points}
                color={route.color}
                lineWidth={2.6}
                transparent
                opacity={0.95}
                depthWrite={false}
                toneMapped={false}
              />
            ))}
        </group>
      ))}
    </group>
  )
}
