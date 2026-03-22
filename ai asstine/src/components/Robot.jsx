import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, MeshWobbleMaterial, Sphere, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { HeadShaderMaterial } from '../shaders/HeadShader'

const Robot = ({ state = 'idle' }) => {
  const bodyRef = useRef()
  const headRef = useRef()
  const eyesRef = useRef()
  const coreRef = useRef()
  const particlesRef = useRef()

  // Animation constants
  const speakingSpeed = 8.0
  const idleSpeed = 1.0
  const thinkingSpeed = 3.0
  
  // Floating Particles logic
  const particlesCount = 20
  const particlesData = useMemo(() => {
    const data = []
    for (let i = 0; i < particlesCount; i++) {
        data.push({
            pos: new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8
            ),
            speed: 0.1 + Math.random() * 0.2
        })
    }
    return data
  }, [])

  useFrame((stateContent, delta) => {
    try {
      const time = stateContent.clock.getElapsedTime()
      if (!bodyRef.current || !headRef.current || !coreRef.current || !eyesRef.current) return

      const isTalking = state === 'talking'
      const isThinking = state === 'thinking'
      const isListening = state === 'listening'
      const isHappy = state === 'happy'
      
      // 1. Body Animation
      let speed = idleSpeed
      if (isTalking) speed = speakingSpeed
      if (isThinking) speed = thinkingSpeed
      
      const bounce = Math.sin(time * speed) * (isTalking ? 0.05 : 0.02)
      bodyRef.current.position.y = bounce
      
      // 2. Head Animation
      headRef.current.position.y = 1.3 + (isTalking ? bounce * 0.5 : bounce)
      if (isThinking) {
          headRef.current.rotation.y = Math.sin(time * 0.5) * 0.1
          headRef.current.rotation.z = Math.cos(time * 0.3) * 0.05
      } else {
          headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.1)
          headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0, 0.1)
      }
      
      // 3. Core Shader Uniforms
      if (coreRef.current.material.uniforms) {
        coreRef.current.material.uniforms.uTime.value = time
        const pulseBase = isTalking ? 10.0 : (isThinking ? 4.0 : 2.0)
        const pulse = Math.sin(time * pulseBase) * 0.15 + 0.85
        
        let targetIntensity = 1.0
        if (isTalking) targetIntensity = 2.0 * pulse
        if (isListening) targetIntensity = 1.2
        if (isThinking) targetIntensity = 1.4 * pulse
        
        coreRef.current.material.uniforms.uIntensity.value = THREE.MathUtils.lerp(
          coreRef.current.material.uniforms.uIntensity.value, 
          targetIntensity, 
          0.1
        )

        coreRef.current.material.uniforms.uMouthWave.value = THREE.MathUtils.lerp(
          coreRef.current.material.uniforms.uMouthWave.value, 
          isTalking ? 1.0 : 0.0, 
          0.1
        )

        coreRef.current.material.uniforms.uListenEffect.value = THREE.MathUtils.lerp(
          coreRef.current.material.uniforms.uListenEffect.value, 
          isListening ? 1.0 : 0.0, 
          0.1
        )
        
        if (isThinking) {
          coreRef.current.rotation.y += delta * 2.0
        }
      }
      
      // 4. Eyes Animation
      const blink = Math.sin(time * 0.5) > 0.98 ? 0.1 : 1
      // State-based Eye Scale & Intensity
      let targetScaleX = 1
      let targetScaleY = blink
      let eyeIntensity = 1.0
      
      if (isTalking) {
        targetScaleX = 1.1 + Math.sin(time * 20.0) * 0.1
        targetScaleY = (2.0 - targetScaleX) * blink
        eyeIntensity = 1.5 + Math.sin(time * 20.0) * 0.5
      } else if (isListening) {
        targetScaleX = 1.2
        targetScaleY = 1.2
        eyeIntensity = 1.2
      } else if (isHappy) {
        targetScaleY = 0.4 
        targetScaleX = 1.2
      }
      
      eyesRef.current.scale.x = THREE.MathUtils.lerp(eyesRef.current.scale.x, targetScaleX, 0.15)
      eyesRef.current.scale.y = THREE.MathUtils.lerp(eyesRef.current.scale.y, targetScaleY, 0.15)
      
      // Apply intensity and color to eyes material
      if (eyesRef.current.children[0] && eyesRef.current.children[0].material) {
        let targetColor = new THREE.Color('#ffffff')
        
        if (isTalking) {
          // Cycle through neon colors: Cyan -> Magenta -> Purple
          const t = time * 3.0
          const c1 = new THREE.Color('#00ffff') // Cyan
          const c2 = new THREE.Color('#ff00ff') // Magenta
          const c3 = new THREE.Color('#7700ff') // Purple
          
          const mix1 = Math.sin(t) * 0.5 + 0.5
          const mix2 = Math.sin(t * 0.7 + 1.0) * 0.5 + 0.5
          
          targetColor = c1.clone().lerp(c2, mix1).lerp(c3, mix2)
        }
        
        eyesRef.current.children.forEach(child => {
          if (child.material) {
            child.material.opacity = 0.4 + 0.4 * eyeIntensity
            child.material.color.lerp(targetColor, 0.1)
          }
        })
      }
      
      // Floating Particles Animation
      if (particlesRef.current && particlesRef.current.children.length === particlesCount) {
         particlesRef.current.children.forEach((p, i) => {
            const data = particlesData[i]
            if (data) {
              p.position.y += Math.sin(time * data.speed + i) * 0.001
              p.position.x += Math.cos(time * data.speed + i) * 0.001
            }
         })
      }
    } catch (e) {
      console.error("Robot Animation Error:", e)
    }
  })

  // Speckled Texture for Body
  const speckledTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const opacity = Math.random() * 0.15
      ctx.fillStyle = `rgba(0,0,0,${opacity})`
      ctx.fillRect(x, y, 1, 1)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])

  return (
    <group>
      {/* 🧱 BODY */}
      <mesh ref={bodyRef} castShadow receiveShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial 
          map={speckledTexture}
          color="#ffffff"
          roughness={0.35}
          metalness={0.0}
          thickness={1.0}
          transmission={0.02} // Slight SSS look
          ior={1.4}
        />
      </mesh>

      {/* 🧠 HEAD ASSEMBLY */}
      <group ref={headRef}>
        {/* Stable Glossy Black Dome */}
        <mesh castShadow>
          <sphereGeometry args={[0.7, 64, 64]} />
          <meshStandardMaterial 
            transparent
            opacity={0.6}
            color="#000000"
            roughness={0.02}
            metalness={0.1}
            envMapIntensity={2}
          />
        </mesh>
        
        {/* Glowing Core */}
        <mesh 
          ref={coreRef} 
          scale={state === 'talking' ? 0.65 + Math.sin(Date.now() * 0.01) * 0.03 : 0.65}
        >
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial attach="material" {...HeadShaderMaterial} />
        </mesh>

        {/* Floating Particles Core */}
        <group ref={particlesRef}>
            {particlesData.map((d, i) => (
                <mesh key={i} position={d.pos}>
                    <sphereGeometry args={[0.005, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </mesh>
            ))}
        </group>

        {/* 👀 EYES */}
        <group ref={eyesRef} position={[0, 0, 0.66]}>
          <mesh position={[-0.22, 0, 0]}>
            <ringGeometry args={[0.08, 0.105, 64]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
            <pointLight intensity={1} distance={1.2} color="#00ffff" />
          </mesh>
          <mesh position={[0.22, 0, 0]}>
            <ringGeometry args={[0.08, 0.105, 64]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
            <pointLight intensity={1} distance={1.2} color="#00ffff" />
          </mesh>
        </group>

        {/* 🎧 SIDE PODS */}
        <group>
          <mesh position={[0.75, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
            <cylinderGeometry args={[0.1, 0.12, 0.15, 32]} />
            <meshStandardMaterial color="#eeeeee" roughness={0.1} metalness={0.6} />
          </mesh>
          <mesh position={[-0.75, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.1, 0.12, 0.15, 32]} />
            <meshStandardMaterial color="#eeeeee" roughness={0.1} metalness={0.6} />
          </mesh>
        </group>
      </group>

      {/* Shadow Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </group>
  )
}

export default Robot
