import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
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
}) {
  const camera = useThree((s) => s.camera)
  const point = useMemo(() => new THREE.Vector3(), [])
  const world = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const segments = useMemo(() => buildSeasonSegments(games), [games])

  useFrame((_, delta) => {
    const manual = (followUntilRef?.current ?? 0) > performance.now()
    if ((!playing && !manual) || mapMode || morphing || !activeGame || !groupRef?.current) return

    const now = timeRef?.current ?? activeGame.year
    const season = seasonFilter === 'all' ? activeGame.season : seasonFilter
    const segment = findTimelineSegment(segments[season] ?? [], now)

    if (segment) {
      sampleSegment(segment, segmentProgress(segment, now), point)
    } else {
      latLonToVector3(activeGame.lat, activeGame.lon, 2.02, point)
    }

    groupRef.current.updateWorldMatrix(true, false)
    world.copy(point)
    groupRef.current.localToWorld(world)

    desired.copy(world).normalize().multiplyScalar(FOLLOW_DISTANCE[eraId] ?? 5.6)

    const k = 1 - Math.exp(-delta * 2.7)
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
