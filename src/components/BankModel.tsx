import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

interface BankModelProps {
  stage?: 'home' | 'options';
}

const BankModel = ({ stage = 'home' }: BankModelProps) => {
  const bankGroupRef = useRef<THREE.Group>(null);
  const platformGroupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);

  // Security Layer Refs
  const hexWireRef = useRef<THREE.Group>(null);
  const gridMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetPMatRef = useRef<THREE.PointsMaterial>(null);
  const focusLightRef = useRef<THREE.PointLight>(null);

  // Platform Hologram Refs
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const ring3Ref = useRef<THREE.Group>(null);

  // Particles for shield surface (radius 4.5)
  const surfaceParticles = useMemo(() => {
    const P = 400;
    const pos = new Float32Array(P * 3);
    for(let i=0; i<P; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = 4.5 + Math.random() * 0.1;
        pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = r * Math.cos(phi);
        pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  // Custom Shaders for Security Layer (White & Realistic Wakanda Effect)
  const matShieldCustom = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#eaf3ff') }, // slight blue-white tint
      uRipple: { value: 0 },
      uBaseOpacity: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uRipple;
      uniform float uBaseOpacity;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Fresnel (Edge glow)
        float fresnel = clamp(1.0 - dot(viewDir, normal), 0.0, 1.0);
        float edgeGlow = pow(fresnel, 3.0) * 0.6; // beautiful rim

        // Scanning Wave (bottom to top looping) - based on radius 4.5
        float normalizedY = (vPosition.y + 4.5) / 9.0;
        float scanPhase = fract(normalizedY * 1.5 - uTime * 0.25);
        float scanGlow = smoothstep(0.9, 1.0, scanPhase) * 1.0;

        // Bounding Breath Effect (going invisible)
        float breath = sin(uTime * 1.5) * 0.15; // wide breathing range

        // Subtle noise
        float n = hash(vPosition.xy * 10.0 + uTime * 0.1) * 0.03;

        // Interactive shockwave ripple
        float dist = length(vPosition);
        float rippleRadius = uRipple * 10.0;
        float rippleGlow = 0.0;
        if (uRipple > 0.0 && uRipple < 1.0) {
           float r = abs(dist - rippleRadius);
           rippleGlow = smoothstep(1.5, 0.0, r) * (1.0 - uRipple) * 2.0;
        }

        // Base target handles the "breathing coming and going invisible"
        float baseTarget = clamp(0.12 + n + breath, 0.0, 1.0);
        
        float finalAlpha = clamp((baseTarget + edgeGlow + scanGlow + rippleGlow) * uBaseOpacity, 0.0, 1.0);
        vec3 finalColor = uColor + (scanGlow + rippleGlow + edgeGlow * 0.5) * vec3(1.0);
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending
  }), []);

  const matWireCustom = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ffffff') },
      uBaseOpacity: { value: 0 }
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uBaseOpacity;
      varying vec3 vPosition;
      
      void main() {
        // Pulse brightness & breathe
        float pulse = sin(uTime * 3.0) * 0.3 + 0.7;
        float breath = sin(uTime * 1.5) * 0.15;

        // Scan wave on wires
        float normalizedY = (vPosition.y + 4.5) / 9.0;
        float scanPhase = fract(normalizedY * 1.5 - uTime * 0.25);
        float scanGlow = smoothstep(0.95, 1.0, scanPhase) * 1.8;

        float finalAlpha = clamp((0.15 + pulse * 0.15 + scanGlow + breath) * uBaseOpacity, 0.0, 1.0);
        vec3 finalColor = uColor + scanGlow * vec3(1.0);
        
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    wireframe: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  }), []);

  // Materials and Geometries (simplified conversion from vanilla)
  const matTempleBody = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xeeeeff, roughness: 0.1, metalness: 0.1,
    transmission: 0.95, thickness: 2.0, ior: 1.5, transparent: true, opacity: 0.95
  }), []);

  const matTempleMetal = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x8899aa, metalness: 0.8, roughness: 0.3
  }), []);

  const matPillar = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.05, transmission: 0.8, thickness: 1.5,
    ior: 1.4, transparent: true, opacity: 0.9
  }), []);

  const matGlowBlue = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x88aaff, emissive: 0x2244ff, emissiveIntensity: 2.0, transparent: true, opacity: 0.8
  }), []);

  const matEdgeGlow = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xe8ecfc, transmission: 0.45, thickness: 0.5, transparent: true, opacity: 0.96
  }), []);

  const triggerScanAnimation = () => {
    if (!hexWireRef.current) return;
    
    // Scale bump
    gsap.killTweensOf(hexWireRef.current.scale);
    gsap.to(hexWireRef.current.scale, {
      x: 1.05, y: 1.05, z: 1.05, duration: 0.15, ease: "power2.out",
      onComplete: () => {
         gsap.to(hexWireRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "power2.inOut" });
      }
    });

    // Emits ripple shockwave shader
    matShieldCustom.uniforms.uRipple.value = 0;
    gsap.to(matShieldCustom.uniforms.uRipple, { value: 1.0, duration: 1.2, ease: "power2.out" });

    // Fade dome IN, hold, then OUT
    gsap.killTweensOf(matShieldCustom.uniforms.uBaseOpacity);
    gsap.killTweensOf(matWireCustom.uniforms.uBaseOpacity);
    if (targetPMatRef.current) gsap.killTweensOf(targetPMatRef.current);
    
    gsap.to(matShieldCustom.uniforms.uBaseOpacity, { value: 1.0, duration: 0.5, ease: "power2.out" });
    gsap.to(matWireCustom.uniforms.uBaseOpacity, { value: 1.0, duration: 0.5, ease: "power2.out" });
    if (targetPMatRef.current) gsap.to(targetPMatRef.current, { opacity: 0.6, duration: 0.5, ease: "power2.out" });
    
    // Fade out after 2.5 seconds to leave only the bank
    gsap.to(matShieldCustom.uniforms.uBaseOpacity, { value: 0, duration: 1.5, ease: "power2.in", delay: 2.5 });
    gsap.to(matWireCustom.uniforms.uBaseOpacity, { value: 0, duration: 1.5, ease: "power2.in", delay: 2.5 });
    if (targetPMatRef.current) gsap.to(targetPMatRef.current, { opacity: 0, duration: 1.5, ease: "power2.in", delay: 2.5 });
  };

  useEffect(() => {
    const handleScan = () => triggerScanAnimation();
    window.addEventListener('trigger-bank-scan', handleScan as EventListener);
    return () => window.removeEventListener('trigger-bank-scan', handleScan as EventListener);
  }, [matShieldCustom, matWireCustom]);

  const handleDomeClick = (e: any) => {
    e.stopPropagation();
    triggerScanAnimation();
  };

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (matShieldCustom) matShieldCustom.uniforms.uTime.value = t;
    if (matWireCustom) matWireCustom.uniforms.uTime.value = t;
    
    // Bank Float
    if (bankGroupRef.current && bankGroupRef.current.scale.x > 0.05) {
      bankGroupRef.current.position.y = 0.6 + Math.sin(t * 0.8) * 0.06;
      bankGroupRef.current.rotation.y += delta * 0.12;
    }

    // Shield Spin
    if (hexWireRef.current && matShieldCustom.uniforms.uBaseOpacity.value > 0.01) {
      hexWireRef.current.rotation.y += delta * 0.05;
    }

    // Platform Rings Spin
    if (ring1Ref.current) ring1Ref.current.rotation.y += delta * 0.28;
    if (ring2Ref.current) ring2Ref.current.rotation.y -= delta * 0.18;
    if (ring3Ref.current) ring3Ref.current.rotation.y += delta * 0.55;
  });

  useEffect(() => {
    if (!bankGroupRef.current || !platformGroupRef.current) return;

    // Reset initial states
    bankGroupRef.current.scale.set(0, 0, 0);
    platformGroupRef.current.position.y = -8;

    matShieldCustom.uniforms.uBaseOpacity.value = 0;
    matWireCustom.uniforms.uBaseOpacity.value = 0;
    if (targetPMatRef.current) targetPMatRef.current.opacity = 0;
    if (hexWireRef.current) {
       hexWireRef.current.position.y = 0.6;
       hexWireRef.current.scale.set(1, 1, 1);
       hexWireRef.current.rotation.set(0, 0, 0);
    }
    if (gridMatRef.current) gridMatRef.current.opacity = 0;
    if (focusLightRef.current) focusLightRef.current.intensity = 0;

    // Stage 2 Animations
    gsap.to(platformGroupRef.current.position, { y: 0, duration: 1.8, ease: "expo.out", delay: 0.1 });
    if (gridMatRef.current) gsap.to(gridMatRef.current, { opacity: 0.25, duration: 2.0, delay: 0.5 });
    if (focusLightRef.current) gsap.to(focusLightRef.current, { intensity: 6.0, duration: 2.0, ease: "power2.out", delay: 0.5 });
    
    // Dome gently fades in for Load Sequence
    gsap.to(matShieldCustom.uniforms.uBaseOpacity, { value: 1.0, duration: 2.0, ease: "power2.out", delay: 0.1 });
    gsap.to(matWireCustom.uniforms.uBaseOpacity, { value: 1.0, duration: 2.0, ease: "power2.out", delay: 0.1 });
    if (targetPMatRef.current) gsap.to(targetPMatRef.current, { opacity: 0.6, duration: 2.0, ease: "power2.out", delay: 0.1 });

    // Then fade OUT after load sequence is completed, leaving only the bank structure moving
    gsap.to(matShieldCustom.uniforms.uBaseOpacity, { value: 0, duration: 1.5, ease: "power2.in", delay: 3.5 });
    gsap.to(matWireCustom.uniforms.uBaseOpacity, { value: 0, duration: 1.5, ease: "power2.in", delay: 3.5 });
    if (targetPMatRef.current) gsap.to(targetPMatRef.current, { opacity: 0, duration: 1.5, ease: "power2.in", delay: 3.5 });

    // Bank fades in
    const timeoutId = setTimeout(() => {
      gsap.to(bankGroupRef.current!.scale, {
         x: 1, y: 1, z: 1, duration: 1.5, ease: "back.out(1.3)", delay: 0.3
      });

      if (gridMatRef.current) gsap.to(gridMatRef.current, { opacity: 0.22, duration: 1.5, delay: 0.6 });
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [matShieldCustom, matWireCustom]);

  return (
    <group ref={rootRef}>
      {/* Focus Light projecting from Grid */}
      <pointLight ref={focusLightRef} position={[0, -1.6, 0]} color={0xffffff} intensity={0} distance={15} decay={2} />

      {/* Grid Floor */}
      <mesh position={[0, -1.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial ref={gridMatRef} color={0xffffff} wireframe transparent opacity={0.0} />
      </mesh>

      {/* Interactive AI Security Shield */}
      <group ref={hexWireRef} position={[0, 0.6, 0]} onClick={handleDomeClick} onPointerEnter={() => { document.body.style.cursor = 'pointer' }} onPointerLeave={() => { document.body.style.cursor = 'default' }}>
        <mesh material={matShieldCustom} renderOrder={2}>
          <icosahedronGeometry args={[4.5, 4]} />
        </mesh>
        <mesh material={matWireCustom}>
          <icosahedronGeometry args={[4.52, 4]} />
        </mesh>
        <points>
           <bufferGeometry>
              <bufferAttribute attach="attributes-position" array={surfaceParticles} count={400} itemSize={3} />
           </bufferGeometry>
           <pointsMaterial ref={targetPMatRef} color={0xffffff} size={0.05} transparent opacity={0.0} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>

      {/* 🏛️ BANK MODEL ASSEMBLY */}
      <group ref={bankGroupRef} position={[0, 0.6, 0]}>
        {/* Stairs/Steps */}
        {[
          { rx: 2.6, rz: 1.85, h: 0.22, y: -1.52 },
          { rx: 2.35, rz: 1.65, h: 0.22, y: -1.30 },
          { rx: 2.1, rz: 1.47, h: 0.22, y: -1.08 }
        ].map((s, i) => (
          <group key={i} position={[0, s.y, 0]}>
            <mesh receiveShadow castShadow material={matTempleMetal}>
              <boxGeometry args={[s.rx * 2, s.h, s.rz * 2]} />
            </mesh>
            <mesh position={[0, s.h / 2 + 0.015, 0]} material={matEdgeGlow}>
              <boxGeometry args={[s.rx * 2 + 0.02, 0.03, s.rz * 2 + 0.02]} />
            </mesh>
          </group>
        ))}

        {/* Main Body */}
        <mesh position={[0, -0.25, 0]} castShadow material={matTempleBody}>
          <boxGeometry args={[3.9, 1.55, 2.8]} />
        </mesh>

        {/* Floating Medallion */}
        <group position={[0, 1.08, 1.57]}>
          <mesh material={matGlowBlue}>
            <torusGeometry args={[0.32, 0.06, 16, 80]} />
          </mesh>
          <mesh material={matTempleMetal} rotation={[0, 0, 0]}>
            <circleGeometry args={[0.25, 50]} />
          </mesh>
        </group>

        {/* Pillars */}
        <group>
          {[-1.65, -0.99, -0.33, 0.33, 0.99, 1.65].map((x, i) => (
            <React.Fragment key={i}>
              <mesh position={[x, -0.27, 1.42]} castShadow material={matPillar}>
                <cylinderGeometry args={[0.135, 0.155, 1.65, 20]} />
              </mesh>
              <mesh position={[x, -0.27, -1.42]} castShadow material={matPillar}>
                <cylinderGeometry args={[0.135, 0.155, 1.65, 20]} />
              </mesh>
            </React.Fragment>
          ))}
        </group>

        {/* Roof Area */}
        <mesh position={[0, 0.62, 0]} castShadow material={matTempleMetal}>
          <boxGeometry args={[4.3, 0.2, 3.1]} />
        </mesh>
        <mesh position={[0, 1.1, 0]} castShadow rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1.4]} material={matTempleBody}>
          <cylinderGeometry args={[0, 2.4, 0.95, 4, 1]} />
        </mesh>
      </group>

      {/* 🛸 PLATFORM */}
      <group ref={platformGroupRef}>
        {/* Step Tiers */}
        {[
          { r: 4.4, h: 0.42, y: -2.6, c: 0xe0e5f5 },
          { r: 3.5, h: 0.38, y: -2.2, c: 0xd8dff2 },
          { r: 2.6, h: 0.32, y: -1.88, c: 0xcdd4ef }
        ].map((td, i) => (
          <mesh key={`tier-${i}`} position={[0, td.y, 0]} receiveShadow>
            <cylinderGeometry args={[td.r, td.r + 0.06, td.h, 80]} />
            <meshStandardMaterial color={td.c} metalness={0.4} roughness={0.4} />
          </mesh>
        ))}

        {/* Holographic Glowing Rings & Connectors */}
        {[
          { ref: ring1Ref, r: 4.3, th: 0.07, y: -2.38, c: 0xffffff, ei: 3.5, count: 8 },
          { ref: ring2Ref, r: 3.42, th: 0.07, y: -2.01, c: 0xf4f7ff, ei: 3.0, count: 8 },
          { ref: ring3Ref, r: 2.52, th: 0.06, y: -1.72, c: 0xeef2ff, ei: 4.0, count: 6 }
        ].map((rd, i) => (
          <group key={`ring-sys-${i}`} ref={rd.ref}>
            <mesh position={[0, rd.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[rd.r, rd.th, 16, 120]} />
              <meshStandardMaterial color={0xffffff} emissive={rd.c} emissiveIntensity={rd.ei} transparent opacity={0.9} />
            </mesh>
            {/* Connectors */}
            {Array.from({ length: rd.count }).map((_, j) => {
              const a = (j / rd.count) * Math.PI * 2;
              return (
                <group key={`conn-${i}-${j}`} position={[Math.cos(a) * rd.r, rd.y, Math.sin(a) * rd.r]}>
                  <mesh castShadow>
                     <cylinderGeometry args={[0.1, 0.1, 0.28, 12]} />
                     <meshStandardMaterial color={0xd8e0f5} metalness={0.9} roughness={0.15} />
                  </mesh>
                  <mesh position={[0, 0.16, 0]}>
                     <sphereGeometry args={[0.055, 12, 12]} />
                     <meshStandardMaterial color={0xffffff} emissive={0xffffff} emissiveIntensity={3.5} transparent opacity={0.95} />
                  </mesh>
                  <mesh rotation={[Math.PI / 2, 0, a + Math.PI]} position={[0, -0.07, 0]}>
                     <torusGeometry args={[0.18, 0.025, 8, 40, Math.PI]} />
                     <meshStandardMaterial color={0xd8e0f5} metalness={0.9} roughness={0.15} />
                  </mesh>
                </group>
              );
            })}
          </group>
        ))}
      </group>
    </group>
  );
};

export default BankModel;
