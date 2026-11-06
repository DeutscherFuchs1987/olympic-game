import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { getMedals, latLonToVector3 } from '../../data/olympics.js'
import { countryLabelPoint, findCountryFeature } from '../../data/countriesGeo.js'
import { latLonToMap, pointToMapPosition } from './markerLayout.js'
import { arcPoints } from './routeUtils.js'

const RADIUS = 2 * 1.005

const RANK_COLORS = ['#f1d888', '#d8dde4', '#dcab7c', '#4aa3ff', '#6a5cff']
const RANK_WIDTHS = [3, 2.5, 2.2, 1.8, 1.5]

/**
 * Top-5 medal countries connected to the host city. When a Games is selected,
 * the globe becomes a constellation of the nations that defined that edition.
 */
export default function MedalConstellation({ game, features, flat = false, visible = true }) {
  const arcs = useMemo(() => {
    if (!game || !features?.length) return []
    const medals = getMedals(game.id)
    if (!medals.length) return []

    const hostSphere = latLonToVector3(game.lat, game.lon, RADIUS)
    const hostMap = latLonToMap(game.lat, game.lon)

    const out = []
    medals.forEach((medal, index) => {
      const feature = findCountryFeature(features, medal.code)
      const label = countryLabelPoint(feature)
      if (!label) return

      const targetSphere = latLonToVector3(label.lat, label.lon, RADIUS)
      const targetMap = latLonToMap(label.lat, label.lon)
      const spherePoints = arcPoints(hostSphere, targetSphere, 36, 0.35)
      const mapPoints = spherePoints.map((p) => pointToMapPosition(p))

      out.push({
        code: medal.code,
        color: RANK_COLORS[index] ?? RANK_COLORS[4],
        width: RANK_WIDTHS[index] ?? 1.4,
        spherePoints,
        mapPoints,
        targetSphere,
        targetMap,
      })
    })
    return out
  }, [game, features])

  if (!visible || arcs.length === 0) return null

  return (
    <group>
      {arcs.map((arc) => (
        <Line
          key={arc.code}
          points={flat ? arc.mapPoints : arc.spherePoints}
          color={arc.color}
          lineWidth={arc.width}
          transparent
          opacity={0.7}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          renderOrder={3}
        />
      ))}

      {arcs.map((arc) => (
        <mesh
          key={arc.code + '-end'}
          position={flat ? arc.targetMap : arc.targetSphere}
          raycast={() => null}
        >
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={0.92}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh position={flat ? latLonToMap(game.lat, game.lon) : latLonToVector3(game.lat, game.lon, RADIUS)} raycast={() => null}>
        <sphereGeometry args={[0.026, 10, 10]} />
        <meshBasicMaterial color="#fff3c4" depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
