import React, { useState } from 'react'
import Experience from './components/Experience'
import { MessageSquare, Mic, Search, Smile, Brain, Cpu } from 'lucide-react'

function App() {
  const [robotState, setRobotState] = useState('idle')

  const states = [
    { id: 'idle', icon: <Cpu />, label: 'Idle' },
    { id: 'talking', icon: <MessageSquare />, label: 'Talking' },
    { id: 'listening', icon: <Mic />, label: 'Listening' },
    { id: 'happy', icon: <Smile />, label: 'Happy' },
    { id: 'thinking', icon: <Brain />, label: 'Thinking' },
  ]

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D CANVAS */}
      <Experience state={robotState} />

      {/* UI OVERLAY */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '50px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.5)',
        zIndex: 10
      }}>
        {states.map((s) => (
          <button
            key={s.id}
            onClick={() => setRobotState(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '30px',
              background: robotState === s.id ? '#00ffff' : 'transparent',
              color: robotState === s.id ? '#000' : '#444',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* LOGO / TITLE */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '40px',
        fontFamily: '"Outfit", sans-serif',
        zIndex: 10
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#111', letterSpacing: '-1px' }}>
          AURA <span style={{ color: '#00ffff' }}>/</span> OS
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: '500' }}>
          PROPRIETARY INTERFACE v2.0
        </p>
      </div>
    </div>
  )
}

export default App
