import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, Sparkles, Grid, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface GraphData {
  month: string;
  value: number;
}

interface BalanceGraph3DProps {
  data: GraphData[];
  isVisible: boolean;
  totalBalance: number;
}

const ParticleFlow = ({ color, position, count = 20, speed = 1, direction = 1 }: { color: string, position: [number, number, number], count?: number, speed?: number, direction?: number }) => {
  const points = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      temp[i * 3] = (Math.random() - 0.5) * 0.8;
      temp[i * 3 + 1] = Math.random() * 4;
      temp[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i);
      y += 0.02 * speed * direction;
      if (direction > 0 && y > 4) y = 0;
      if (direction < 0 && y < 0) y = 4;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
    points.current.rotation.y += 0.01;
  });

  return (
    <points ref={points} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={color} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

const Ribbon = ({ position, height, index, isVisible, maxData, value, showLabel = true, isHovered, onHover }: { position: [number, number, number], height: number, index: number, isVisible: boolean, maxData: number, value: number, showLabel?: boolean, isHovered: boolean, onHover: (hovered: boolean) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0);
    shape.lineTo(0.4, 0);
    shape.lineTo(0.4, 1);
    shape.lineTo(-0.4, 1);
    shape.closePath();

    const settings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, settings);
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const targetHeight = isVisible ? (height / maxData) * 4 : 0.01;
    const hoverScale = isHovered ? 1.15 : 1;

    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetHeight * hoverScale, 0.05);
    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, hoverScale, 0.1);
    meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, hoverScale, 0.1);

    meshRef.current.position.y = Math.sin(t * 1.5 + index * 0.4) * 0.05;
  });

  const color = useMemo(() => {
    const hue = 0.6 - (index / 7) * 0.3;
    return new THREE.Color().setHSL(hue, 1, 0.5);
  }, [index]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 2.5 : 1.2}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* 💰 Floating Amount Label (User Friendly) */}
      {isVisible && showLabel && (
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5} position={[0, (height / maxData) * 4 + 0.6, 0.2]}>
          <Text
            fontSize={isHovered ? 0.3 : 0.2}
            color={isHovered ? "#00E5FF" : "white"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {`₹${Math.round(value).toLocaleString()}`}
          </Text>
        </Float>
      )}

      {/* ✨ Particle Flow (Context Aware) */}
      {isVisible && (
        <>
          <ParticleFlow color="#4ADE80" position={[0, 0, 0]} count={15} speed={1.5} direction={1} />
          {index % 3 === 0 && <ParticleFlow color="#FBBF24" position={[0, 0, 0.4]} count={10} speed={0.8} direction={1} />}
          {index % 2 === 0 && <ParticleFlow color="#F87171" position={[0, 0, -0.4]} count={12} speed={1.2} direction={-1} />}
        </>
      )}
    </group>
  );
};

import MonthLabelHologram from './MonthLabelHologram';

const BalanceGraph3D = ({ data, isVisible, totalBalance }: BalanceGraph3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const maxData = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const targetScale = isVisible ? 1.3 : 0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.04));
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.1;
    groupRef.current.rotation.x = -0.15;
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* 🌫️ Hyper-Futuristic Atmosphere */}
      <fog attach="fog" args={["#030712", 10, 25]} />
      
      <Grid
        position={[0, -0.05, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={1}
        cellColor="#020617"
        sectionSize={2.5}
        sectionThickness={2}
        sectionColor="#00E5FF"
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {data.map((item, i) => (
        <group key={item.month} position={[(i - (data.length - 1) / 2) * 1.3, 0, 0]}>
          <Ribbon
            index={i}
            height={item.value}
            maxData={maxData}
            position={[0, 0, 0]}
            isVisible={isVisible}
            value={item.value}
            isHovered={hoveredIndex === i}
            onHover={(h) => setHoveredIndex(h ? i : null)}
          />
          <Ribbon
            index={i}
            height={item.value * 0.8}
            maxData={maxData}
            position={[0, 0, -0.8]}
            isVisible={isVisible}
            value={item.value * 0.8}
            showLabel={false}
            isHovered={hoveredIndex === i}
            onHover={(h) => setHoveredIndex(h ? i : null)}
          />
        </group>
      ))}

      {/* ✨ Digital Particles (Digital Dust) */}
      <Sparkles count={450} scale={[15, 8, 10]} size={2} speed={0.3} color="#00E5FF" opacity={0.4} />

      <group position={[0, 7, -3]}>
        <Float speed={2} rotationIntensity={0.15} floatIntensity={0.5}>
          <group>
            <Text
              fontSize={0.2}
              color="#00E5FF"
              position={[0, 1, 0]}
              fontWeight="black"
              letterSpacing={0.2}
            >
              LOC BANK // AI FINANCIAL HUB
            </Text>
            <Text
              fontSize={0.9}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#00E5FF"
            >
              {`₹${totalBalance.toLocaleString()}`}
            </Text>
            <Text
              fontSize={0.12}
              color="#475569"
              position={[0, -0.7, 0]}
              fontWeight="bold"
            >
              QUANTUM-SECURED • REAL-TIME SYNC • v2.0
            </Text>
          </group>
        </Float>
      </group>

      {/* ✨ Simple, User-Friendly Month Labels - Always Visible & Static */}
      {data.map((item, i) => (
        <Text
          key={`simple-label-${item.month}`}
          position={[(i - (data.length - 1) / 2) * 1.3, 0.4, 0.8]}
          fontSize={0.25}
          color="#FFFFFF"
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
        >
          {item.month.toUpperCase()}
        </Text>
      ))}
    </group>
  );
};

export default BalanceGraph3D;
