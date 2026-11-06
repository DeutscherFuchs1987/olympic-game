import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { latLonToVector3 } from '../../data/olympics.js'
import { latLonToMap } from './markerLayout.js'

const RADIUS = 2 * 1.012

function CancelledMarker({ game, morphRef, visible, active, onHover, onSelect }) {
  const groupRef = useRef()
  const camera = useThree((s) => s.camera)
  const sphere = useRef(new THREE.Vector3())
  const flat = useRef(new THREE.Vector3())

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    if (!sphere.current.lengthSq()) {
      latLonToVector3(game.lat, game.lon, RADIUS, sphere.current)
      latLonToMap(game.lat, game.lon, flat.current)
    }

    const morph = morphRef?.current ?? 0
    group.position.copy(sphere.current).lerp(flat.current, morph)
    group.visible = visible

    const world = group.position.clone()
    group.parent?.localToWorld(world)
    const distance = camera.position.distanceTo(world)
    const scale = Math.min(1.35, Math.max(0.55, distance / 5.6)) * (active ? 1.45 : 1)
    group.scale.setScalar(scale)
  })

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        if (!visible) return
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        onHover?.(game, { x: e.clientX, y: e.clientY })
      }}
      onPointerMove={(e) => {
        if (!visible) return
        e.stopPropagation()
        onHover?.(game, { x: e.clientX, y: e.clientY })
      }}
      onPointerOut={(e) => {
        if (!visible) return
        e.stopPropagation()
        document.body.style.cursor = 'default'
        onHover?.(null, null)
      }}
      onClick={(e) => {
        if (!visible) return
        e.stopPropagation()
        onSelect?.(game)
      }}
    >
      <Billboard>
        <mesh raycast={() => null}>
          <ringGeometry args={[0.038, 0.054, 32]} />
          <meshBasicMaterial
            color={active ? '#ff7188' : '#ee334e'}
            transparent
            opacity={active ? 1 : 0.7}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation-z={Math.PI / 4} raycast={() => null}>
          <planeGeometry args={[0.105, 0.008]} />
          <meshBasicMaterial
            color={active ? '#ff7188' : '#ee334e'}
            transparent
            opacity={active ? 1 : 0.72}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <circleGeometry args={[0.085, 16]} />
          <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  )
}

/** Ghost markers for the Games that were cancelled (1916, 1940, 1944). */
export default function CancelledMarkers({
  games = [],
  morphRef,
  revealYear = 0,
  selectedId = null,
  onHover,
  onSelect,
}) {
  return (
    <group>
      {games.map((game) => (
        <CancelledMarker
          key={game.id}
          game={game}
          morphRef={morphRef}
          visible={game.year <= revealYear}
          active={game.id === selectedId}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
