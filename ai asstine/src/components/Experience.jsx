import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, ToneMapping, SSAO } from '@react-three/postprocessing'
import Robot from './Robot'

const Experience = ({ state = 'idle' }) => {
  return (
    <Canvas shadows dpr={[1, 2]}>
      {/* 🎥 CAMERA SETUP */}
      <PerspectiveCamera makeDefault position={[0, 1.5, 4]} fov={40} />
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.5}
        enableDamping
        dampingFactor={0.05}
      />

      {/* 💡 LIGHTING SETUP (3-Point Studio) */}
      <ambientLight intensity={0.2} />
      
      {/* Key Light */}
      <spotLight 
        position={[5, 10, 5]} 
        intensity={1.5} 
        angle={0.3} 
        penumbra={1} 
        castShadow 
        shadow-mapSize={2048}
      />
      
      {/* Fill Light */}
      <directionalLight 
        position={[-5, 5, -5]} 
        intensity={0.5} 
        color="#ffffff" 
      />
      
      {/* Rim Light (Cyan Glow) */}
      <pointLight 
        position={[0, 2, -3]} 
        intensity={2} 
        color="#00ffff" 
        distance={10} 
      />

      {/* 🌍 ENVIRONMENT */}
      <Environment preset="city" />
      <color attach="background" args={['#f8f8f8']} />
      
      {/* 🤖 ROBOT */}
      <Suspense fallback={null}>
        <Float 
          speed={1.5} 
          rotationIntensity={0.2} 
          floatIntensity={0.5}
          scale={0.7}
        >
          <Robot state={state} />
        </Float>
      </Suspense>

      {/* 🌫️ SHADOWS */}
      <ContactShadows 
          position={[0, -1, 0]} 
          opacity={0.4} 
          scale={10} 
          blur={2.5} 
          far={4} 
        />

      {/* 🎬 POST-PROCESSING */}
      <EffectComposer>
        <Bloom 
          intensity={1.5} 
          luminanceThreshold={0.9} 
          luminanceSmoothing={0.025} 
          mipmapBlur 
        />
        <Noise opacity={0.02} />
        <ToneMapping />
      </EffectComposer>
    </Canvas>
  )
}

export default Experience
