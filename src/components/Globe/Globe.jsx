import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import { BackSide, SRGBColorSpace, Vector3 } from 'three'
import CityMarkers from './CityMarkers.jsx'
import CityRoute from './CityRoute.jsx'
import CountryBorders from './CountryBorders.jsx'
import TorchRelay from './TorchRelay.jsx'
import MedalConstellation from './MedalConstellation.jsx'
import CancelledMarkers from './CancelledMarkers.jsx'
import FollowCam from './FollowCam.jsx'
import {
  buildMapMarkerPositions,
  buildMarkerPositions,
  isFrontFacing,
  latLonToMap,
  MAP_HEIGHT,
  MAP_WIDTH,
} from './markerLayout.js'
import { useCountryFeatures } from '../../data/countriesGeo.js'
import { colorForSeason, latLonToVector3 } from '../../data/olympics'

const RADIUS = 2
const SURFACE = RADIUS * 1.012
const COLOR_URL = '/textures/earth-color.jpg'

const ERA_ROTATION = {
  origin: 0.022,
  interwar: 0.028,
  postwar: 0.034,
  cold: 0.04,
  modern: 0.05,
  contemporary: 0.058,
}

function EarthSphere({ radius, morphUniform }) {
  const colorMap = useTexture(COLOR_URL)

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: colorMap,
      roughness: 0.92,
      metalness: 0.08,
      emissive: new THREE.Color('#0a1e3a'),
      emissiveIntensity: 0.18,
    })

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uMorph = morphUniform
      shader.uniforms.uMapWidth = { value: MAP_WIDTH }
      shader.uniforms.uMapHeight = { value: MAP_HEIGHT }

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uMorph;
           uniform float uMapWidth;
           uniform float uMapHeight;`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           objectNormal = normalize(mix(objectNormal, vec3(0.0, 0.0, 1.0), uMorph));`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec3 mapPosition = vec3(
             (uv.x - 0.5) * uMapWidth,
             (uv.y - 0.5) * uMapHeight,
             0.0
           );
           transformed = mix(transformed, mapPosition, uMorph);`,
        )
    }

    return mat
  }, [colorMap, morphUniform])

  useEffect(() => {
    colorMap.colorSpace = SRGBColorSpace
    colorMap.anisotropy = 8
    colorMap.needsUpdate = true
    material.needsUpdate = true
  }, [colorMap, material])

  return (
    <mesh material={material}>
      <sphereGeometry args={[radius, 128, 96]} />
    </mesh>
  )
}

function PlaceholderSphere({ radius }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 48]} />
      <meshStandardMaterial color="#0a1a33" roughness={0.9} metalness={0.1} />
    </mesh>
  )
}

function LabelProjector({ position, mapPosition, morphRef, groupRef, labelRef }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const point = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const el = labelRef?.current
    const group = groupRef?.current
    if (!el) return

    if (!position || !group) {
      el.style.opacity = '0'
      return
    }

    const morph = morphRef?.current ?? 0
    group.updateWorldMatrix(true, false)
    point.copy(position)
    if (mapPosition) point.lerp(mapPosition, morph)
    group.localToWorld(point)

    if (morph < 0.5 && !isFrontFacing(point, camera)) {
      el.style.opacity = '0'
      return
    }

    point.project(camera)
    const x = (point.x * 0.5 + 0.5) * size.width
    const y = (-point.y * 0.5 + 0.5) * size.height

    el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    el.style.opacity = point.z < 1 ? '1' : '0'
  })

  return null
}

/**
 * Animates the camera between the globe view and the flat-map view. It lives
 * inside the Canvas so it can access the real camera and OrbitControls.
 */
function MapCamera({ mapMode, controlsRef, hasCard = false }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const mounted = useRef(false)
  const wasMapView = useRef(false)

  useEffect(() => {
    const controls = controlsRef?.current
    if (!mounted.current) {
      mounted.current = true
      return
    }

    // Opening a card on the globe must not reset the camera or fight the
    // fly-to animation. Only react while the map view is (or was) active.
    if (!mapMode && !wasMapView.current) return
    if (mapMode) wasMapView.current = true

    const fullAspect = Math.max(0.4, size.width / size.height)
    const reserved = hasCard ? Math.min(440, size.width * 0.48) : 0
    const availableWidth = Math.max(320, size.width - reserved)
    const aspect = availableWidth / size.height
    const halfFov = (camera.fov * Math.PI) / 360
    const fitHeight = MAP_HEIGHT / 2 / Math.tan(halfFov)
    const fitWidth = MAP_WIDTH / 2 / (Math.tan(halfFov) * aspect)
    const mapDistance = Math.max(fitHeight, fitWidth) * 1.12
    const visibleWidth = 2 * mapDistance * Math.tan(halfFov) * fullAspect
    const shift = reserved ? (reserved / 2 / size.width) * visibleWidth : 0

    if (!mapMode) wasMapView.current = false

    gsap.killTweensOf(camera.position)
    gsap.to(camera.position, {
      x: mapMode ? shift : 0,
      y: mapMode ? 0 : 2.4,
      z: mapMode ? mapDistance : 5.6,
      duration: 1.7,
      ease: 'power2.inOut',
      onUpdate: () => controls?.update(),
    })

    if (controls) {
      gsap.killTweensOf(controls.target)
      gsap.to(controls.target, {
        x: mapMode ? shift : 0,
        y: 0,
        z: 0,
        duration: 1.7,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      })
    }
  }, [mapMode, camera, size.width, size.height, controlsRef, hasCard])

  return null
}

export default function Globe({
  cities = [],
  cancelledGames = [],
  onHover,
  onSelect,
  activeGame = null,
  selectedGame = null,
  revealYear = 2028,
  timelineYear = 2028,
  visitedIds = null,
  interactive = true,
  paused = false,
  mapMode = false,
  morphing = false,
  morphRef,
  timeRef,
  eraId = 'modern',
  playing = false,
  seasonFilter = 'all',
  followUntilRef,
  controlsRef,
  groupRef,
  labelRef,
}) {
  const internalRef = useRef()
  const ref = groupRef ?? internalRef
  const atmosphereRef = useRef()
  const features = useCountryFeatures()

  const markerPositions = useMemo(
    () => buildMarkerPositions(cities, SURFACE),
    [cities],
  )
  const mapMarkerPositions = useMemo(
    () => buildMapMarkerPositions(cities),
    [cities],
  )
  const morphUniform = useMemo(() => ({ value: 0 }), [])

  const label = useMemo(() => {
    if (!activeGame) return { position: null, mapPosition: null }
    const index = cities.findIndex((c) => c.id === activeGame.id)
    if (index >= 0) {
      return {
        position: markerPositions[index],
        mapPosition: mapMarkerPositions[index],
      }
    }
    // Cancelled Games are not part of the main marker list.
    return {
      position: latLonToVector3(activeGame.lat, activeGame.lon, SURFACE),
      mapPosition: latLonToMap(activeGame.lat, activeGame.lon),
    }
  }, [activeGame, cities, markerPositions, mapMarkerPositions])

  // Start the globe with the first host city facing the viewer instead of
  // showing an empty ocean: at 1896 there is only one marker, and it matters.
  const placed = useRef(false)
  useLayoutEffect(() => {
    if (placed.current || !ref.current || cities.length === 0) return
    placed.current = true
    const point = latLonToVector3(cities[0].lat, cities[0].lon, 1)
    ref.current.rotation.y = Math.atan2(-point.x, point.z)
  }, [cities, ref])

  const savedYaw = useRef(0)
  const wasMap = useRef(false)
  useEffect(() => {
    if (!ref.current) return
    gsap.killTweensOf(ref.current.rotation)
    if (mapMode) {
      wasMap.current = true
      savedYaw.current = ref.current.rotation.y
      gsap.to(ref.current.rotation, {
        y: 0,
        duration: 1.5,
        ease: 'power2.inOut',
      })
    } else if (wasMap.current) {
      gsap.to(ref.current.rotation, {
        y: savedYaw.current,
        duration: 1.5,
        ease: 'power2.inOut',
      })
    }
  }, [mapMode, ref])

  useFrame((_, delta) => {
    const morph = morphRef?.current ?? 0
    morphUniform.value = morph

    if (!paused && !mapMode && !morphing && ref.current) {
      ref.current.rotation.y += delta * (ERA_ROTATION[eraId] ?? 0.05)
    }

    if (atmosphereRef.current?.material) {
      atmosphereRef.current.material.opacity = 0.1 * (1 - morph)
    }
  })

  const flat = mapMode
  const linesVisible = !morphing

  return (
    <group ref={ref}>
      <Suspense fallback={<PlaceholderSphere radius={RADIUS} />}>
        <EarthSphere radius={RADIUS} morphUniform={morphUniform} />
      </Suspense>

      <mesh ref={atmosphereRef} scale={1.16} raycast={() => null}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#4aa3ff"
          transparent
          opacity={0.1}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>

      <CityRoute
        games={cities}
        selectedGame={selectedGame}
        revealYear={revealYear}
        timelineYear={timelineYear}
        flat={flat}
        visible={linesVisible}
      />

      <CountryBorders
        features={features}
        countryCode={selectedGame?.countryCode ?? null}
        accent={colorForSeason(selectedGame?.season)}
        flat={flat}
        visible={linesVisible}
      />

      <MedalConstellation
        game={selectedGame}
        features={features}
        flat={flat}
        visible={linesVisible}
      />

      <CityMarkers
        cities={cities}
        positions={markerPositions}
        mapPositions={mapMarkerPositions}
        morphRef={morphRef}
        onHover={onHover}
        onSelect={onSelect}
        selectedId={activeGame?.id ?? null}
        revealYear={revealYear}
        visitedIds={visitedIds}
        interactive={interactive}
      />

      <CancelledMarkers
        games={cancelledGames}
        morphRef={morphRef}
        revealYear={revealYear}
        selectedId={activeGame?.id ?? null}
        onHover={onHover}
        onSelect={onSelect}
      />

      <TorchRelay
        games={cities}
        activeGame={activeGame}
        timeRef={timeRef}
        morphRef={morphRef}
        seasonFilter={seasonFilter}
      />

      <FollowCam
        playing={playing}
        games={cities}
        activeGame={activeGame}
        timeRef={timeRef}
        groupRef={ref}
        controlsRef={controlsRef}
        eraId={eraId}
        seasonFilter={seasonFilter}
        followUntilRef={followUntilRef}
        mapMode={mapMode}
        morphing={morphing}
      />

      <LabelProjector
        position={label.position}
        mapPosition={label.mapPosition}
        morphRef={morphRef}
        groupRef={ref}
        labelRef={labelRef}
      />

      <MapCamera mapMode={mapMode} controlsRef={controlsRef} hasCard={!!selectedGame} />
    </group>
  )
}
