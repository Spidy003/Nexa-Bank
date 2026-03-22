import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, MeshWobbleMaterial, Sphere, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { HeadShaderMaterial } from './HeadShader'

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

  const [isBlooping, setIsBlooping] = React.useState(false)
  const [isStartled, setIsStartled] = React.useState(false)

  const handlePointerDown = (e) => {
    e.stopPropagation()
    setIsBlooping(true)
    setTimeout(() => setIsBlooping(false), 900)
  }

  const handlePointerEnter = () => {
    setIsStartled(true)
    setTimeout(() => setIsStartled(false), 800)
  }

  useFrame((stateContent, delta) => {
    try {
      const time = stateContent.clock.getElapsedTime()
      if (!bodyRef.current || !headRef.current || !coreRef.current || !eyesRef.current) return

      const isTalking = state === 'talking'
      const isThinking = state === 'thinking'
      const isListening = state === 'listening'
      const isHappy = state === 'happy'

      // 1. Reading the Form (Interactive Attention Logic)
      const mouseX = stateContent.mouse.x
      const mouseY = stateContent.mouse.y
      const distToMouse = Math.sqrt((mouseX + 0.6) ** 2 + (mouseY + 0.2) ** 2)
      
      // Calculate depth/distance to make the robot lean IN toward the screen when mouse is close
      const leanIn = Math.max(0, 1.0 - Math.abs(mouseX)) * 1.5
      
      // Target Form Focus (Robot is at X=3.6 on right side, Form is at X=0 in center)
      // We explicitly make it look left at the form (-0.9 radians) and UP slightly (-0.2 radians)
      const targetLookX = -0.9 + (mouseX * -0.4);
      const targetLookY = -0.2 + (mouseY * -0.4); 

      // Organic swaying & Lifelike look around (simulating reading the form)
      const swayX = Math.sin(time * 0.8) * 0.08
      const swayY = Math.cos(time * 1.5) * 0.04
      const lookAroundX = Math.sin(time * 0.35) * 0.3 + Math.sin(time * 0.15) * 0.15; // Scans the form text
      const lookAroundY = Math.sin(time * 0.25) * 0.1;
      
      // Head closely watches the UI while organically tracking mouse movement
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetLookX + swayX + lookAroundX, 0.15)
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetLookY + swayY + lookAroundY, 0.15)
      
      // Body leans IN toward the form itself
      bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, (mouseX * -0.1) + swayX * 0.5, 0.1)
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, (mouseY * -0.1) + swayY, 0.1)
      bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, targetLookX * 0.4, 0.1)
      
      // Subtle 3D positional shift
      bodyRef.current.position.x = THREE.MathUtils.lerp(bodyRef.current.position.x, mouseX * 0.3, 0.1)
      headRef.current.position.x = THREE.MathUtils.lerp(headRef.current.position.x, mouseX * 0.3, 0.1)
      
      // Z-depth popping (Lean in to read the screen)
      bodyRef.current.position.z = THREE.MathUtils.lerp(bodyRef.current.position.z, leanIn * 0.5, 0.1)
      headRef.current.position.z = THREE.MathUtils.lerp(headRef.current.position.z, leanIn * 0.5, 0.1)

      // 2. Body Animation (Bloop! & Startle)
      let speed = idleSpeed
      if (isTalking) speed = speakingSpeed
      if (isThinking) speed = thinkingSpeed
      
      const bounce = Math.sin(time * speed) * (isTalking ? 0.05 : 0.02)
      bodyRef.current.position.y = bounce
      
      if (isStartled) {
        const jump = Math.sin(time * 40) * 0.1
        bodyRef.current.position.y += jump
        bodyRef.current.scale.setScalar(THREE.MathUtils.lerp(bodyRef.current.scale.x, 1.15, 0.2))
      } else if (isBlooping) {
        // Insane Jump & Spin Interactive Effect!
        const bloopScale = 1.0 + Math.sin(time * 30) * 0.2
        bodyRef.current.position.y += Math.sin(time * 15) * 0.4 // High jump
        headRef.current.rotation.y += Math.sin(time * 20) * Math.PI // Spin head around
        bodyRef.current.scale.set(1.4 - (bloopScale - 1) * 2, bloopScale, 1.4 - (bloopScale - 1) * 2)
      } else {
        bodyRef.current.scale.x = THREE.MathUtils.lerp(bodyRef.current.scale.x, 1, 0.1)
        bodyRef.current.scale.y = THREE.MathUtils.lerp(bodyRef.current.scale.y, 1, 0.1)
        bodyRef.current.scale.z = THREE.MathUtils.lerp(bodyRef.current.scale.z, 1, 0.1)
      }

      // 3. Head Animation
      headRef.current.position.y = 1.3 + (isTalking ? bounce * 0.5 : bounce)
      if (isThinking) {
        headRef.current.rotation.y += Math.sin(time * 0.5) * 0.01
        headRef.current.rotation.z = Math.cos(time * 0.3) * 0.05
      }

      // 4. Core Shader Uniforms & Crazy Light Flicker
      if (coreRef.current && coreRef.current.material && coreRef.current.material.uniforms) {
        const uniforms = coreRef.current.material.uniforms
        if (uniforms.uTime) uniforms.uTime.value = time
        const pulseBase = isTalking ? 10.0 : (isThinking ? 4.0 : 2.0)
        const flicker = Math.random() > 0.9 ? 1.5 : 1.0 // Crazy flickering
        const pulse = (Math.sin(time * pulseBase) * 0.15 + 0.85) * flicker

        // Reactive Glowing based on Mouse Proximity
        const proximityBoost = Math.max(0, 1.0 - distToMouse) * 1.5
        let targetIntensity = (1.0 + proximityBoost) * pulse
        if (isTalking) targetIntensity = 2.5 * pulse + proximityBoost
        if (isListening) targetIntensity = 1.5 + proximityBoost
        if (isThinking) targetIntensity = 1.8 * pulse

        if (uniforms.uIntensity) {
          uniforms.uIntensity.value = THREE.MathUtils.lerp(
            uniforms.uIntensity.value,
            targetIntensity,
            0.2
          )
        }

        if (uniforms.uMouthWave) {
          uniforms.uMouthWave.value = THREE.MathUtils.lerp(
            uniforms.uMouthWave.value,
            isTalking ? 1.0 : 0.0,
            0.1
          )
        }

        if (uniforms.uListenEffect) {
          uniforms.uListenEffect.value = THREE.MathUtils.lerp(
            uniforms.uListenEffect.value,
            isListening ? 1.0 : 0.0,
            0.1
          )
        }

        // Random Glitch Effect
        if (Math.random() > 0.98) {
          uniforms.uIntensity.value *= 2.0
        }
      }

      // 5. Look Away & Blink Reaction (Random)
      const proximityBoost = Math.max(0, 1.0 - distToMouse)
      const blink = (Math.sin(time * 0.5) > 0.98 || (proximityBoost > 0.8 && Math.random() > 0.95)) ? 0.05 : 1
      let targetScaleX = 1 + proximityBoost * 0.2
      let targetScaleY = blink * (1 + proximityBoost * 0.2)
      let eyeIntensity = 1.0 + proximityBoost * 1.5

      if (isTalking) {
        targetScaleX = 1.1 + Math.sin(time * 30.0) * 0.2 // Random jitter
        targetScaleY = (2.2 - targetScaleX) * blink
        eyeIntensity = 2.0 + Math.sin(time * 40.0) * 1.0
      } else if (isListening) {
        targetScaleX = 1.3
        targetScaleY = 1.3
        eyeIntensity = 1.5
      }

      eyesRef.current.scale.x = THREE.MathUtils.lerp(eyesRef.current.scale.x, targetScaleX, 0.2)
      eyesRef.current.scale.y = THREE.MathUtils.lerp(eyesRef.current.scale.y, targetScaleY, 0.2)

      // Crazy Color Shift for Eyes
      if (eyesRef.current.children[0] && eyesRef.current.children[0].material) {
        let targetColor = new THREE.Color('#ffffff')
        if (isTalking || isThinking) {
          const t = time * 10.0
          const hues = ['#00ffff', '#ff00ff', '#7700ff', '#ffffff']
          targetColor = new THREE.Color(hues[Math.floor(t % hues.length)])
        }

        eyesRef.current.children.forEach(child => {
          if (child.material) {
            child.material.opacity = 0.6 + 0.4 * eyeIntensity
            child.material.color.lerp(targetColor, 0.2)
          }
        })
      }

      // 6. Floating Particles (Crazy Speed)
      if (particlesRef.current) {
        const pFactor = isThinking ? 5.0 : 1.0
        particlesRef.current.children.forEach((p, i) => {
          const data = particlesData[i]
          if (data) {
            p.position.y += Math.sin(time * data.speed * pFactor + i) * 0.005 * pFactor
            p.position.x += Math.cos(time * data.speed * pFactor + i) * 0.005 * pFactor
            p.scale.setScalar(THREE.MathUtils.lerp(p.scale.x, isThinking ? 3.0 : 1.0, 0.1))
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
      <mesh ref={bodyRef} castShadow receiveShadow onPointerDown={handlePointerDown} onPointerEnter={handlePointerEnter}>
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

        {/* Crazy Energy Light (Inside Head) */}
        <pointLight
          intensity={state === 'idle' ? 0.5 : 2.5}
          distance={2}
          color="#00ffff"
          position={[0, 0, 0.5]}
        />

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
            <pointLight intensity={1.5} distance={1.2} color="#00ffff" />
          </mesh>
          <mesh position={[0.22, 0, 0]}>
            <ringGeometry args={[0.08, 0.105, 64]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
            <pointLight intensity={1.5} distance={1.2} color="#00ffff" />
          </mesh>
        </group>

        {/* 🎧 SIDE PODS */}
        <group>
          <mesh position={[0.75, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.12, 0.15, 32]} />
            <meshStandardMaterial color="#eeeeee" roughness={0.1} metalness={0.6} />
          </mesh>
          <mesh position={[-0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
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
