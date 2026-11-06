import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { colorForSeason } from '../../data/olympics'
import {
  buildMapMarkerPositions,
  buildMarkerPositions,
  isFrontFacing,
} from './markerLayout.js'

const RADIUS = 2
const SURFACE = RADIUS * 1.012
const BASE = 0.042
const REF_DISTANCE = 5.6
const GHOST_SCALE = 0.58

export default function CityMarkers({
  cities,
  positions: positionsProp,
  mapPositions: mapPositionsProp,
  morphRef,
  onHover,
  onSelect,
  selectedId = null,
  revealYear = 2028,
  visitedIds,
  interactive = true,
}) {
  const outlineRef = useRef()
  const ringRef = useRef()
  const dotRef = useRef()
  const visitRef = useRef()
  const hitRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const worldQuat = useMemo(() => new THREE.Quaternion(), [])
  const localQuat = useMemo(() => new THREE.Quaternion(), [])
  const tmpPoint = useMemo(() => new THREE.Vector3(), [])
  const worldPoint = useMemo(() => new THREE.Vector3(), [])
  const displayPoint = useMemo(() => new THREE.Vector3(), [])
  const scales = useRef(
    cities.map((c) => (c.year <= revealYear ? 1 : GHOST_SCALE)),
  )
  const downPos = useRef({ x: 0, y: 0 })
  const [hoveredId, setHoveredId] = useState(null)
  const camera = useThree((s) => s.camera)

  // Flat, billboard-style markers: a dark rim, a coloured ring and a centre dot.
  const outlineGeometry = useMemo(() => new THREE.RingGeometry(0.86, 1.15, 40), [])
  const ringGeometry = useMemo(() => new THREE.RingGeometry(0.6, 0.9, 40), [])
  const dotGeometry = useMemo(() => new THREE.CircleGeometry(0.31, 24), [])
  const visitGeometry = useMemo(() => new THREE.RingGeometry(1.42, 1.6, 40), [])
  const hitGeometry = useMemo(() => new THREE.CircleGeometry(1.35, 16), [])

  const positions = useMemo(
    () => positionsProp ?? buildMarkerPositions(cities, SURFACE),
    [positionsProp, cities],
  )
  const mapPositions = useMemo(
    () => mapPositionsProp ?? buildMapMarkerPositions(cities),
    [mapPositionsProp, cities],
  )

  const visited = useMemo(() => {
    if (!visitedIds) return cities.map(() => false)
    return cities.map((c) => visitedIds.has(c.id))
  }, [cities, visitedIds])

  // The globe is a history map: only Games up to the time cursor are visible.
  // The active/nearest point is always revealed so its label never points at air.
  const revealed = useMemo(
    () => cities.map((c) => c.year <= revealYear || c.id === selectedId),
    [cities, revealYear, selectedId],
  )
  const revealKey = useMemo(
    () => revealed.map((value) => (value ? '1' : '0')).join(''),
    [revealed],
  )

  useEffect(() => {
    const onDown = (e) => {
      downPos.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  useEffect(() => () => {
    document.body.style.cursor = 'default'
  }, [])

  // Recolour when the hovered/selected marker or the time frontier changes.
  useEffect(() => {
    const ring = ringRef.current
    const dot = dotRef.current
    if (!ring || !dot) return
    const color = new THREE.Color()
    cities.forEach((city, i) => {
      const active = i === hoveredId || (selectedId != null && city.id === selectedId)
      const ghost = !revealed[i] && !active
      color.set(ghost ? '#3f5062' : colorForSeason(city.season))
      ring.setColorAt(i, color)
      color.set(ghost ? '#070a0f' : active ? '#ffffff' : colorForSeason(city.season))
      dot.setColorAt(i, color)
    })
    if (ring.instanceColor) ring.instanceColor.needsUpdate = true
    if (dot.instanceColor) dot.instanceColor.needsUpdate = true
  }, [cities, hoveredId, selectedId, revealKey])

  useFrame((state, delta) => {
    const outline = outlineRef.current
    const ring = ringRef.current
    const dot = dotRef.current
    const visit = visitRef.current
    const hit = hitRef.current
    if (!outline || !ring || !dot || !hit) return

    const n = Math.min(cities.length, positions.length)
    if (scales.current.length !== cities.length) {
      scales.current = revealed.map((value) => (value ? 1 : GHOST_SCALE))
    }

    const pulse = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 2.4)
    const k = Math.min(1, delta * 9)
    const morph = morphRef?.current ?? 0

    // All markers share one billboard orientation. Work in the marker mesh's
    // local space, because the whole globe group slowly rotates.
    hit.updateWorldMatrix(true, false)
    hit.getWorldQuaternion(worldQuat).invert()
    localQuat.copy(worldQuat).multiply(camera.quaternion)

    for (let i = 0; i < n; i += 1) {
      const isHovered = i === hoveredId
      const isSelected = selectedId != null && cities[i].id === selectedId
      const target = isHovered
        ? 2.05
        : isSelected
          ? 1.6
          : !revealed[i]
            ? GHOST_SCALE
            : visited[i]
              ? 1.12
              : 1
      const cur = scales.current[i] ?? 0
      scales.current[i] = cur + (target - cur) * k

      // Constant screen size: measure the distance to this particular marker,
      // not to the globe centre, otherwise near markers become giant rings.
      displayPoint.copy(positions[i]).lerp(mapPositions[i], morph)
      worldPoint.copy(displayPoint)
      hit.localToWorld(worldPoint)
      const markerZoom = Math.min(1.4, Math.max(0.34, worldPoint.distanceTo(camera.position) / REF_DISTANCE))

      const size = (scales.current[i] ?? 1) * markerZoom * BASE

      dummy.position.copy(displayPoint)
      dummy.quaternion.copy(localQuat)
      dummy.scale.setScalar(size)
      dummy.updateMatrix()
      outline.setMatrixAt(i, dummy.matrix)
      ring.setMatrixAt(i, dummy.matrix)
      dot.setMatrixAt(i, dummy.matrix)
      hit.setMatrixAt(i, dummy.matrix)

      if (visit) {
        dummy.scale.setScalar(visited[i] && revealed[i] ? size * 1.55 * pulse : 0)
        dummy.updateMatrix()
        visit.setMatrixAt(i, dummy.matrix)
      }
    }

    outline.instanceMatrix.needsUpdate = true
    ring.instanceMatrix.needsUpdate = true
    dot.instanceMatrix.needsUpdate = true
    hit.instanceMatrix.needsUpdate = true
    if (visit) visit.instanceMatrix.needsUpdate = true
  })

  const visibleAt = (instanceId) => {
    const mesh = hitRef.current
    if (!mesh || instanceId == null || !positions[instanceId]) return false
    const morph = morphRef?.current ?? 0
    tmpPoint.copy(positions[instanceId]).lerp(mapPositions[instanceId], morph)
    mesh.localToWorld(tmpPoint)
    if (morph > 0.5) return true
    return isFrontFacing(tmpPoint, camera)
  }

  const handleMove = (e) => {
    if (!interactive) return
    e.stopPropagation()
    const id = e.instanceId
    if (!visibleAt(id)) {
      if (hoveredId != null) setHoveredId(null)
      if (document.body.style.cursor !== 'default') document.body.style.cursor = 'default'
      onHover?.(null, null)
      return
    }
    if (id !== hoveredId) setHoveredId(id)
    document.body.style.cursor = 'pointer'
    onHover?.(cities[id], { x: e.clientX, y: e.clientY })
  }

  const handleOut = (e) => {
    if (!interactive) return
    e.stopPropagation()
    setHoveredId(null)
    document.body.style.cursor = 'default'
    onHover?.(null, null)
  }

  const handleClick = (e) => {
    if (!interactive) return
    const dx = e.clientX - downPos.current.x
    const dy = e.clientY - downPos.current.y
    if (dx * dx + dy * dy > 25) return
    const id = e.instanceId
    if (!visibleAt(id)) return
    const game = id != null ? cities[id] : null
    if (!game) return
    e.stopPropagation()
    onSelect?.(game)
  }

  const count = cities.length

  return (
    <group>
      <instancedMesh
        ref={visitRef}
        args={[visitGeometry, undefined, count]}
        frustumCulled={false}
        raycast={() => null}
        renderOrder={2}
      >
        <meshBasicMaterial
          color="#f0dca0"
          transparent
          opacity={0.62}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={outlineRef}
        args={[outlineGeometry, undefined, count]}
        frustumCulled={false}
        raycast={() => null}
        renderOrder={3}
      >
        <meshBasicMaterial
          color="#050b14"
          transparent
          opacity={0.62}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={ringRef}
        args={[ringGeometry, undefined, count]}
        frustumCulled={false}
        raycast={() => null}
        renderOrder={4}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.96}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={dotRef}
        args={[dotGeometry, undefined, count]}
        frustumCulled={false}
        raycast={() => null}
        renderOrder={5}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Invisible, slightly larger hit target. */}
      <instancedMesh
        ref={hitRef}
        args={[hitGeometry, undefined, count]}
        frustumCulled={false}
        renderOrder={6}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </instancedMesh>
    </group>
  )
}
