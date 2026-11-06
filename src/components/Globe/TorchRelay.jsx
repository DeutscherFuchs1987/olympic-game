import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { pointToMapPosition } from './markerLayout.js'
import { arcPoints, ROUTE_SURFACE } from './routeUtils.js'
import { latLonToVector3 } from '../../data/olympics.js'

const clamp01 = (v) => Math.max(0, Math.min(1, v))

/**
 * The Olympic flame travelling along the active route. It uses the same arc
 * as CityRoute and follows the globe -> map morph as well.
 */
export default function TorchRelay({ games, activeGame, timeRef, morphRef }) {
  const groupRef = useRef()
  const trailRef = useRef([])
  const camera = useThree((s) => s.camera)
  const sphere = useMemo(() => new THREE.Vector3(), [])
  const flat = useMemo(() => new THREE.Vector3(), [])
  const display = useMemo(() => new THREE.Vector3(), [])
  const world = useMemo(() => new THREE.Vector3(), [])
  const trailSphere = useMemo(() => new THREE.Vector3(), [])
  const trailFlat = useMemo(() => new THREE.Vector3(), [])
  const trailDisplay = useMemo(() => new THREE.Vector3(), [])

  const route = useMemo(() => {
    if (!activeGame) return null
    const list = games.filter((g) => g.season === activeGame.season)
    const index = list.findIndex((g) => g.id === activeGame.id)
    if (index <= 0) return null

    const from = list[index - 1]
    const to = list[index]
    const a = latLonToVector3(from.lat, from.lon, ROUTE_SURFACE)
    const b = latLonToVector3(to.lat, to.lon, ROUTE_SURFACE)
    const points = arcPoints(a, b, 48)
    return {
      from,
      to,
      points,
      mapPoints: points.map((p) => pointToMapPosition(p)),
    }
  }, [games, activeGame])

  useFrame((state) => {
    const group = groupRef.current
    if (!group || !route) return

    const now = timeRef?.current ?? route.to.year
    const progress = clamp01((now - route.from.year) / Math.max(1, route.to.year - route.from.year))
    const morph = morphRef?.current ?? 0

    const sample = (p, outSphere, outFlat) => {
      const f = p * (route.points.length - 1)
      const i = Math.min(route.points.length - 2, Math.floor(f))
      const t = f - i
      outSphere.copy(route.points[i]).lerp(route.points[i + 1], t)
      outFlat.copy(route.mapPoints[i]).lerp(route.mapPoints[i + 1], t)
    }

    sample(progress, sphere, flat)
    display.copy(sphere).lerp(flat, morph)

    group.position.copy(display)
    group.visible = true

    world.copy(display)
    group.parent?.localToWorld(world)
    const distance = camera.position.distanceTo(world)
    const pulse = 1 + 0.16 * Math.sin(state.clock.elapsedTime * 6)
    const scale = Math.min(1.4, Math.max(0.5, distance / 5.6)) * pulse
    group.scale.setScalar(scale)

    trailRef.current.forEach((node, index) => {
      if (!node) return
      const p = clamp01(progress - (index + 1) * 0.035)
      sample(p, trailSphere, trailFlat)
      trailDisplay.copy(trailSphere).lerp(trailFlat, morph)
      node.position.copy(trailDisplay).sub(display)
      node.scale.setScalar(1 - index * 0.2)
    })
  })

  if (!route) return null

  return (
    <group ref={groupRef}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial color="#fff3c4" toneMapped={false} />
      </mesh>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshBasicMaterial
          color="#fcb131"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          ref={(node) => { trailRef.current[index] = node }}
          raycast={() => null}
        >
          <sphereGeometry args={[0.026, 8, 8]} />
          <meshBasicMaterial
            color="#fcb131"
            transparent
            opacity={0.32 - index * 0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
