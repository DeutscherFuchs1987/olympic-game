import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { latLonToMap } from './markerLayout.js'
import {
  buildSeasonSegments,
  findTimelineSegment,
  sampleSegment,
  segmentProgress,
} from './routeUtils.js'
import { latLonToVector3 } from '../../data/olympics.js'

const clamp01 = (v) => Math.max(0, Math.min(1, v))

/**
 * The Olympic flame travelling through the time cursor. It follows the actual
 * interval between two Games (not the nearest-Games midpoint), so it starts
 * moving as soon as the timeline leaves the previous host city.
 */
export default function TorchRelay({ games, activeGame, timeRef, morphRef, seasonFilter = 'all' }) {
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

  const segments = useMemo(() => buildSeasonSegments(games), [games])

  useFrame((state) => {
    const group = groupRef.current
    if (!group || !activeGame) return

    const now = timeRef?.current ?? activeGame.year
    const season = seasonFilter === 'all' ? activeGame.season : seasonFilter
    const segment = findTimelineSegment(segments[season] ?? [], now)
    const progress = segment ? segmentProgress(segment, now) : 0
    const morph = morphRef?.current ?? 0

    if (segment) {
      sampleSegment(segment, progress, sphere, flat)
    } else {
      latLonToVector3(activeGame.lat, activeGame.lon, 2.012, sphere)
      latLonToMap(activeGame.lat, activeGame.lon, flat)
    }

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
      node.visible = Boolean(segment)
      if (!segment) return
      const p = clamp01(progress - (index + 1) * 0.035)
      sampleSegment(segment, p, trailSphere, trailFlat)
      trailDisplay.copy(trailSphere).lerp(trailFlat, morph)
      node.position.copy(trailDisplay).sub(display)
      node.scale.setScalar(1 - index * 0.2)
    })
  })

  if (!activeGame) return null

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
