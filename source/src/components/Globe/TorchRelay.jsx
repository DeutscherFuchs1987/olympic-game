import { useEffect, useMemo, useRef } from 'react'
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

  // Small four-point star, still used for the glow and the trail behind the
  // runner. The runner itself is drawn as a canvas silhouette so the pose
  // stays readable at this size.
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 1)
    shape.quadraticCurveTo(0.16, 0.16, 1, 0)
    shape.quadraticCurveTo(0.16, -0.16, 0, -1)
    shape.quadraticCurveTo(-0.16, -0.16, -1, 0)
    shape.quadraticCurveTo(-0.16, 0.16, 0, 1)
    return new THREE.ShapeGeometry(shape, 16)
  }, [])

  const torchTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(252, 177, 49, 0.85)'
    ctx.shadowBlur = 14

    const stroke = (points, color, width) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      points.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Legs in a running stride.
    stroke([[128, 168], [174, 218], [194, 266]], '#fff3c4', 18)
    stroke([[128, 168], [98, 222], [78, 270]], '#fff3c4', 18)
    // Torso, arms and head.
    stroke([[128, 92], [124, 172]], '#fff3c4', 27)
    stroke([[126, 108], [92, 144]], '#fff3c4', 14)
    stroke([[128, 108], [162, 88], [180, 72]], '#fff3c4', 14)
    ctx.fillStyle = '#fff3c4'
    ctx.beginPath()
    ctx.arc(128, 58, 22, 0, Math.PI * 2)
    ctx.fill()

    // Torch handle and flame.
    stroke([[180, 78], [190, 30]], '#f0dca0', 7)
    const flame = (cx, cy, outer, inner, color) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(cx, cy - outer)
      ctx.quadraticCurveTo(cx + inner, cy - inner, cx + outer, cy)
      ctx.quadraticCurveTo(cx + inner, cy + inner, cx, cy + outer)
      ctx.quadraticCurveTo(cx - inner, cy + inner, cx - outer, cy)
      ctx.quadraticCurveTo(cx - inner, cy - inner, cx, cy - outer)
      ctx.closePath()
      ctx.fill()
    }
    flame(190, 17, 25, 5, '#fcb131')
    flame(190, 17, 12, 2.5, '#fff8d8')

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [])

  useEffect(() => () => torchTexture?.dispose(), [torchTexture])
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
            opacity={0.14}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {torchTexture && (
          <mesh
            raycast={() => null}
            position-y={0.055}
            renderOrder={20}
          >
            <planeGeometry args={[0.11, 0.1375]} />
            <meshBasicMaterial
              map={torchTexture}
              transparent
              alphaTest={0.02}
              depthWrite={false}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
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
