import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { latLonToMap } from './markerLayout.js'
import {
  ROUTE_SURFACE,
  buildChronoSegments,
  buildSeasonSegments,
  findTimelineSegment,
  sampleSegment,
  segmentProgress,
} from './routeUtils.js'
import { latLonToVector3 } from '../../data/olympics.js'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const smoothstep = (t) => t * t * (3 - 2 * t)

/**
 * The Olympic flame travelling through the time cursor. It follows the actual
 * interval between two Games (not the nearest-Games midpoint), so it starts
 * moving as soon as the timeline leaves the previous host city.
 *
 * `hopRef` is used for summer -> winter transitions inside the same year: the
 * flame travels along a short arc instead of teleporting.
 */
export default function TorchRelay({
  games,
  activeGame,
  timeRef,
  morphRef,
  seasonFilter = 'all',
  hopRef,
}) {
  const groupRef = useRef()
  const trailRef = useRef([])
  const camera = useThree((s) => s.camera)

  // Four-point star with concave sides, like the reference. A ShapeGeometry
  // keeps it crisp at any size; Billboard makes it face the camera on both the
  // globe and the flat map.
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 1)
    shape.quadraticCurveTo(0.16, 0.16, 1, 0)
    shape.quadraticCurveTo(0.16, -0.16, 0, -1)
    shape.quadraticCurveTo(-0.16, -0.16, -1, 0)
    shape.quadraticCurveTo(-0.16, 0.16, 0, 1)
    return new THREE.ShapeGeometry(shape, 16)
  }, [])
  const sphere = useMemo(() => new THREE.Vector3(), [])
  const flat = useMemo(() => new THREE.Vector3(), [])
  const display = useMemo(() => new THREE.Vector3(), [])
  const world = useMemo(() => new THREE.Vector3(), [])
  const trailSphere = useMemo(() => new THREE.Vector3(), [])
  const trailFlat = useMemo(() => new THREE.Vector3(), [])
  const trailDisplay = useMemo(() => new THREE.Vector3(), [])

  const seasonal = useMemo(() => buildSeasonSegments(games), [games])
  const chronological = useMemo(() => buildChronoSegments(games), [games])
  const segments = useMemo(
    () => (seasonFilter === 'all'
      ? chronological
      : seasonal[seasonFilter] ?? []),
    [seasonFilter, chronological, seasonal],
  )

  useFrame((state) => {
    const group = groupRef.current
    if (!group || !activeGame) return

    const now = timeRef?.current ?? activeGame.year
    const morph = morphRef?.current ?? 0
    const segment = findTimelineSegment(segments, now)
    const progress = segment ? segmentProgress(segment, now) : 0

    let travelSegment = null
    let travelProgress = 0

    const hop = hopRef?.current
    if (hop) {
      const t = clamp01((performance.now() - hop.start) / hop.duration)
      if (t < 1) {
        travelSegment = hop
        travelProgress = smoothstep(t)
      } else {
        hopRef.current = null
      }
    }

    if (!travelSegment && segment) {
      travelSegment = segment
      travelProgress = progress
    }

    if (travelSegment) {
      sampleSegment(travelSegment, travelProgress, sphere, flat)
    } else {
      latLonToVector3(activeGame.lat, activeGame.lon, ROUTE_SURFACE, sphere)
      latLonToMap(activeGame.lat, activeGame.lon, flat)
    }

    display.copy(sphere).lerp(flat, morph)

    // Keep the flame above the marker rings. Otherwise the active marker's
    // white centre can cover the star at the same radius.
    if (morph < 0.5) display.multiplyScalar(1.008)
    else display.z += 0.008

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
      node.visible = Boolean(travelSegment)
      if (!travelSegment) return
      const p = clamp01(travelProgress - (index + 1) * 0.035)
      sampleSegment(travelSegment, p, trailSphere, trailFlat)
      trailDisplay.copy(trailSphere).lerp(trailFlat, morph)
      node.position.copy(trailDisplay).sub(display)
      node.scale.setScalar(0.028 * (1 - index * 0.2))
    })
  })

  if (!activeGame) return null

  return (
    <group ref={groupRef}>
      <Billboard>
        <mesh raycast={() => null} scale={0.12} renderOrder={19} rotation-z={Math.PI / 4}>
          <primitive object={starGeometry} attach="geometry" />
          <meshBasicMaterial
            color="#fcb131"
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh raycast={() => null} scale={0.08} renderOrder={20} rotation-z={Math.PI / 4}>
          <primitive object={starGeometry} attach="geometry" />
          <meshBasicMaterial
            color="#fff3c4"
            transparent
            opacity={1}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>

      {[0, 1, 2].map((index) => (
        <group
          key={index}
          ref={(node) => { trailRef.current[index] = node }}
        >
          <Billboard>
            <mesh raycast={() => null} renderOrder={10}>
              <primitive object={starGeometry} attach="geometry" />
              <meshBasicMaterial
                color="#fcb131"
                transparent
                opacity={0.32 - index * 0.08}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </Billboard>
        </group>
      ))}
    </group>
  )
}
