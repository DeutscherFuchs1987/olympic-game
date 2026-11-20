import { useCallback, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import { latLonToVector3 } from '../data/olympics'

const RADIUS = 2
const UP = new THREE.Vector3(0, 1, 0)

// Each era gets its own camera grammar: early years are slower and more
// observational, the modern era is quicker and more confident.
const ERA_FLIGHT = {
  origin: { duration: 2.4, distance: 5.6, ease: 'power2.inOut' },
  interwar: { duration: 2.15, distance: 5.5, ease: 'power2.inOut' },
  postwar: { duration: 1.95, distance: 5.4, ease: 'power2.inOut' },
  cold: { duration: 1.75, distance: 5.3, ease: 'power2.inOut' },
  modern: { duration: 1.55, distance: 5.2, ease: 'power2.inOut' },
  contemporary: { duration: 1.4, distance: 5.1, ease: 'power2.inOut' },
}

export function useCameraFlight(controlsRef, groupRef, eraId = 'modern') {
  const camera = useThree((s) => s.camera)
  const defaultPos = useMemo(() => new THREE.Vector3(0, 2.4, 5.6), [])
  const config = ERA_FLIGHT[eraId] ?? ERA_FLIGHT.modern

  const flyToEvent = useCallback(
    (event) => {
      const controls = controlsRef?.current
      const group = groupRef?.current
      if (!event || !group || !camera) return

      const local = latLonToVector3(event.lat, event.lon, RADIUS * 1.01)
      local.applyAxisAngle(UP, group.rotation.y)
      const dest = local.normalize().multiplyScalar(config.distance)
      dest.y += 0.12

      if (!Number.isFinite(dest.x) || !Number.isFinite(dest.y) || !Number.isFinite(dest.z)) {
        return
      }

      gsap.killTweensOf(camera.position)
      if (controls) controls.enabled = false

      gsap.to(camera.position, {
        x: dest.x,
        y: dest.y,
        z: dest.z,
        duration: config.duration,
        ease: config.ease,
        onUpdate: () => controls?.update(),
        onComplete: () => {
          if (controls) controls.enabled = true
        },
      })

      if (controls) {
        gsap.killTweensOf(controls.target)
        gsap.to(controls.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: config.duration,
          ease: config.ease,
          onUpdate: () => controls.update(),
        })
      }
    },
    [camera, controlsRef, groupRef, config],
  )

  const resetView = useCallback(() => {
    const controls = controlsRef?.current
    if (!camera) return
    gsap.killTweensOf(camera.position)
    if (controls) controls.enabled = false

    gsap.to(camera.position, {
      x: defaultPos.x,
      y: defaultPos.y,
      z: defaultPos.z,
      duration: 1.4,
      ease: 'power2.inOut',
      onUpdate: () => controls?.update(),
      onComplete: () => {
        if (controls) controls.enabled = true
      },
    })

    if (controls) {
      gsap.killTweensOf(controls.target)
      gsap.to(controls.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.4,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      })
    }
  }, [camera, controlsRef, defaultPos])

  return { flyToEvent, resetView }
}
