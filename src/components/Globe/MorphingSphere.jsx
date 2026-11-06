import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ShaderMaterial, SphereGeometry } from 'three'
import { globeToMapVertex, globeToMapFragment } from '../../shaders/globeToMap.glsl.js'

export default function MorphingSphere({ morph = 0, radius = 2, detail = 64 }) {
  const meshRef = useRef()
  const { gl } = useThree()

  const material = useMemo(() => {
    const mat = new ShaderMaterial({
      vertexShader: globeToMapVertex,
      fragmentShader: globeToMapFragment,
      uniforms: {
        uMorph: { value: morph },
        uRadius: { value: radius },
      },
      transparent: true,
    })
    return mat
  }, [morph, radius])

  useFrame(() => {
    if (meshRef.current && meshRef.current.material.uniforms) {
      meshRef.current.material.uniforms.uMorph.value = morph
      meshRef.current.material.uniforms.uRadius.value = radius
    }
  })

  const geometry = useMemo(() => {
    return new SphereGeometry(radius, detail, detail)
  }, [radius, detail])

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} rotation={[0.3, 0, 0]} />
  )
}
