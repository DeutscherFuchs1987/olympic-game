import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'

function MorphSphere({ morph }) {
  const meshRef = useRef()
  
  useFrame(() => {
    if (meshRef.current && meshRef.current.material.uniforms) {
      meshRef.current.material.uniforms.uMorph.value = morph
    }
  })
  
  const vertexShader = /* glsl */`
    uniform float uMorph;
    varying vec2 vUv;
    #define PI 3.141592653589793
    
    void main() {
      vUv = uv;
      vec3 dir = normalize(position);
      vec3 globePos = dir * 2.2;
      
      float phi = asin(clamp(dir.y, -1.0, 1.0));
      float theta = atan(dir.z, dir.x);
      
      // Equirectangular map coords (wrapped nicely)
      vec3 mapPos = vec3(theta * 2.2 * 0.5, phi * 2.2, 0.0);
      vec3 pos = mix(globePos, mapPos, uMorph);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `
  
  const fragmentShader = /* glsl */`
    varying vec2 vUv;
    uniform float uMorph;
    
    void main() {
      vec3 color = vec3(0.08, 0.22, 0.5);
      // subtle longitude strip
      float strip = step(0.998, fract((vUv.x - 0.5) * 12.0 + 0.5));
      color += vec3(0.1, 0.15, 0.25) * strip * (1.0 - uMorph);
      gl_FragColor = vec4(color, 1.0 - uMorph * 0.12);
    }
  `
  
  return (
    <mesh ref={meshRef} rotation={[0.25, 0, 0]}>
      <sphereGeometry args={[2.2, 128, 96]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uMorph: { value: morph } }}
        transparent
      />
    </mesh>
  )
}

export default function SpikeScene({ onComplete }) {
  const [morph, setMorph] = useState(0)
  const animating = useRef(false)
  const camRef = useRef()
  
  const goToMap = () => {
    if (animating.current) return
    animating.current = true
    gsap.to({ m: 0 }, {
      m: 1,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: function() {
        setMorph(this.targets()[0].m)
      },
      onComplete: () => {
        setTimeout(() => onComplete?.(), 250)
      }
    })
  }
  
  const goToGlobe = () => {
    animating.current = false
    gsap.to({ m: morph }, {
      m: 0,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: function() {
        setMorph(this.targets()[0].m)
      }
    })
  }
  
  return (
    <div className="scene scene--active">
      <Canvas camera={{ position: [0, 0, 6.5], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={['#04060d']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[6,3,6]} intensity={1.1} />
        <MorphSphere morph={morph} />
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={4} maxDistance={10} />
      </Canvas>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', gap: 16, justifyContent: 'center', zIndex: 5 }}>
        <button onClick={goToMap} style={{ padding: '10px 18px', background: '#fcb131', color: '#04060d', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, letterSpacing: '0.02em' }}>
          ГЛОБУС → КАРТА
        </button>
        <button onClick={goToGlobe} style={{ padding: '10px 18px', background: '#0081c8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, letterSpacing: '0.02em' }}>
          ОБРАТНО
        </button>
      </div>
    </div>
  )
}
