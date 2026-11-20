import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ROUTE_SURFACE,
  buildChronoSegments,
  buildSeasonSegments,
  findTimelineSegment,
  sampleSegment,
  segmentProgress,
} from './routeUtils.js'
import { latLonToVector3 } from '../../data/olympics.js'

const FOLLOW_DISTANCE = {
  origin: 5.9,
  interwar: 5.8,
  postwar: 5.7,
  cold: 5.6,
  modern: 5.5,
  contemporary: 5.4,
}

const smoothstep = (t) => t * t * (3 - 2 * t)

/**
 * During autoplay the camera chases the Olympic flame from host city to host
 * city. Manual orbiting is handed back as soon as playback stops.
 */
export default function FollowCam({
  playing,
  games,
  activeGame,
  timeRef,
  groupRef,
  controlsRef,
  eraId,
  seasonFilter,
  followUntilRef,
  mapMode,
  morphing,
  hopRef,
}) {
  const camera = useThree((s) => s.camera)
  const point = useMemo(() => new THREE.Vector3(), [])
  const world = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])

  const seasonal = useMemo(() => buildSeasonSegments(games), [games])
  const chronological = useMemo(() => buildChronoSegments(games), [games])
  const segments = useMemo(
    () => (seasonFilter === 'all'
      ? chronological
      : seasonal[seasonFilter] ?? []),
    [seasonFilter, chronological, seasonal],
  )

  useFrame((_, delta) => {
    const manual = (followUntilRef?.current ?? 0) > performance.now()
    if ((!playing && !manual) || mapMode || morphing || !activeGame || !groupRef?.current) return

    // A tab switch can produce a huge delta. Clamp it so the camera eases
    // instead of jumping across the globe in one frame.
    const dt = Math.min(delta, 0.05)
    const hop = hopRef?.current
    let travel = null
    let progress = 0

    if (hop) {
      const t = Math.max(0, Math.min(1, (performance.now() - hop.start) / hop.duration))
      if (t < 1) {
        travel = hop
        progress = smoothstep(t)
      } else {
        hopRef.current = null
      }
    }

    if (!travel) {
      const now = timeRef?.current ?? activeGame.year
      const segment = findTimelineSegment(segments, now)
      if (segment) {
        travel = segment
        progress = segmentProgress(segment, now)
      }
    }

    if (travel) {
      sampleSegment(travel, progress, point)
    } else {
      latLonToVector3(activeGame.lat, activeGame.lon, ROUTE_SURFACE, point)
    }

    groupRef.current.updateWorldMatrix(true, false)
    world.copy(point)
    groupRef.current.localToWorld(world)

    desired.copy(world).normalize().multiplyScalar(FOLLOW_DISTANCE[eraId] ?? 5.6)

    const k = 1 - Math.exp(-dt * 2.7)
    camera.position.lerp(desired, k)

    const controls = controlsRef?.current
    if (controls) {
      controls.target.lerp(world, k)
      controls.update()
    } else {
      camera.lookAt(world)
    }
  })

  return null
}
