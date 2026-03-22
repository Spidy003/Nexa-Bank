import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import BankModel from './BankModel';
import AssistantExperience from './assistant3d/AssistantExperience';
import { useAssistant } from '@/context/AssistantContext';

const SceneContent = ({ status, theme }: { status: string, theme: string }) => {
  const { status: appStatus } = useAssistant();

  // Helper to map app status to robot state
  const getRobotState = (s: string) => {
    switch (s) {
      case "speaking": return "talking";
      case "listening": return "listening";
      case "processing": return "thinking";
      default: return "idle";
    }
  };

  useFrame((state) => {
    const mouseX = state.mouse.x * 0.5;
    const mouseY = state.mouse.y * 0.2;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, mouseX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.2 + mouseY, 0.05);
    state.camera.lookAt(0, 1.5, 0);
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.2, 12]} fov={52} />

      {/* Lights (Matching bank.js logic) */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 15]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={theme === 'light' ? "#3B82F6" : "#00E5FF"} />

      <Environment preset="city" />

      <Suspense fallback={null}>
        {/* 🏛️ Bank Model */}
        <BankModel stage={appStatus === 'idle' ? 'home' : 'options'} />

        {/* 🤖 Robot Assistant exactly in bottom right corner */}
        <group
          position={[3.6, 0.4, 7.5]}
          rotation={[0, -0.4, 0]}
          scale={0.5}
        >
          <AssistantExperience state={getRobotState(appStatus)} />
        </group>
      </Suspense>

      <ContactShadows
        position={[0, -2.5, 0]}
        opacity={0.3}
        scale={25}
        blur={2.5}
        far={10}
      />
    </>
  );
};

const BankScene3D = () => {
  const { status } = useAssistant();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, background: "var(--bg-global)", transition: "background 0.4s ease" }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
        <SceneContent status={status} theme={theme} />
      </Canvas>

      {/* ═══════════════════════════════════════ UI OVERLAY (1:1 MIRROR) ═══════════════════════════════════ */}
      <div id="uiOverlay" className="fixed inset-0 pointer-events-none z-10 font-sans">

        {/* Brand / Logo */}
        <div id="brand" className="absolute top-[28px] left-[36px] flex items-center gap-[10px] pointer-events-auto">
          <div id="brandIcon" className="w-10 h-10">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="38" height="38" rx="10" stroke="url(#g1)" strokeWidth="1.5" />
              <path d="M20 8L32 16V24L20 32L8 24V16L20 8Z" fill="url(#g2)" opacity="0.9" />
              <path d="M20 13L27 17.5V26.5L20 31L13 26.5V17.5L20 13Z" fill="white" opacity="0.2" />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#6B8DFF" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="g2" x1="8" y1="8" x2="32" y2="32">
                  <stop stopColor="#4F6EF7" />
                  <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span id="brandName" className="font-display text-[18px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#00E5FF] to-[#0284C7]">
            NexaBank
          </span>
        </div>

        {/* Floating Decorative Cards */}
        <div className="insane-card insane-card-tr" id="cardTopRight">
          <div className="card-shimmer"></div>
          <div className="card-chip">
            <div className="chip-line"></div>
            <div className="chip-line"></div>
            <div className="chip-line"></div>
          </div>
          <div className="card-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
          </div>
          <div className="card-brand">NexaBank</div>
          <div className="card-number">•••• •••• •••• 4251</div>
          <div className="card-details">
            <span>09/28</span>
            <span>CVV 774</span>
          </div>
          <div className="card-status">SYSTEM ACTIVE</div>
        </div>

        <div className="insane-card insane-card-bl" id="cardBottomLeft">
          <div className="card-shimmer"></div>
          <div className="card-chip gold">
            <div className="chip-line"></div>
            <div className="chip-line"></div>
            <div className="chip-line"></div>
          </div>
          <div className="card-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <div className="card-brand">AURA PRIME</div>
          <div className="card-number">PLATINUM ELITE</div>
          <div className="card-details">
            <span>INFINITY EDITION</span>
          </div>
          <div className="card-status">SECURE ACCESS</div>
        </div>

        {/* Corner watermark */}
        <div id="cornerMark" className="absolute bottom-[28px] left-[36px] font-mono text-[9.5px] font-medium tracking-widest text-[#4B5563] opacity-60">
          NEXABANK OS v4.2.1 &nbsp;|&nbsp; BUILD 20260319
        </div>

      </div>
    </div>
  );
};

export default BankScene3D;
