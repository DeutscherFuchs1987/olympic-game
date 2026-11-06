import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { buildSeasonSegments, findTimelineSegment } from './routeUtils.js'

const SEASONS = [
  { season: 'summer', color: '#fcb131' },
  { season: 'winter', color: '#4aa3ff' },
]

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

  if (!visible) return null

  return (
    <group>
      {SEASONS.map(({ season, color }) => {
        const list = segments[season] ?? []
        const active = findTimelineSegment(list, timelineYear)
        return (
          <group key={season}>
            {list
              .filter((segment) => segment.year <= revealYear || segment.id === active?.id)
              .map((segment) => (
                <Line
                  key={segment.id + (flat ? '-flat' : '')}
                  points={flat ? segment.mapPoints : segment.points}
                  color={color}
                  lineWidth={1}
                  transparent
                  opacity={focused ? 0.05 : 0.2}
                  depthWrite={false}
                  toneMapped={false}
                />
              ))}

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
        )
      })}
    </group>
  )
}
